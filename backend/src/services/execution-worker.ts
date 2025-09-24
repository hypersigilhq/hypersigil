import { executionModel, Execution } from '../models/execution';
import { promptModel } from '../models/prompt';
import { fileModel } from '../models/file';
import { providerRegistry } from '../providers/provider-registry';
import { ProviderError, ExecutionOptions, JSONSchema, AIProviderName, AIProviderNames, FileAttachment } from '../providers/base-provider';
import { promptService } from './prompt-service';
import { Scheduler } from '../workers';
import { randomUUID } from 'crypto';


export class ExecutionWorker {
    private static instance: ExecutionWorker;
    private providerConcurrencyLimits: Map<AIProviderName, number> = new Map(); // Per-provider concurrency limits
    private isInitialized: boolean = false;
    private pollingInterval: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

    private constructor() {
        this.initializeProviderLimits();
    }

    /**
     * Initialize default concurrency limits for all providers
     */
    private initializeProviderLimits(): void {
        AIProviderNames.forEach(p => {
            this.setProviderConcurrencyLimit(p, 1)
        })
        console.log('Initialized provider concurrency limits:', Object.fromEntries(this.providerConcurrencyLimits));
    }

    public static getInstance(): ExecutionWorker {
        if (!ExecutionWorker.instance) {
            ExecutionWorker.instance = new ExecutionWorker();
        }
        return ExecutionWorker.instance;
    }

    /**
     * Initialize the service and start polling for work
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing ExecutionService...');

        try {
            // Handle any existing running executions that were interrupted
            await this.handleInterruptedExecutions();

            // Start polling for work
            this.startPolling();

            this.isInitialized = true;
            console.log('ExecutionService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ExecutionService:', error);
            throw error;
        }
    }

    /**
     * Handle executions that were running when the service was stopped
     */
    private async handleInterruptedExecutions(): Promise<void> {
        const runningExecutions = await executionModel.findByStatus('running');

        if (runningExecutions.length > 0) {
            console.log(`Found ${runningExecutions.length} interrupted running executions, processing them first...`);

            // Group executions by provider
            const executionsByProvider = new Map<AIProviderName, Execution[]>();
            for (const execution of runningExecutions) {
                if (!executionsByProvider.has(execution.provider)) {
                    executionsByProvider.set(execution.provider, []);
                }
                executionsByProvider.get(execution.provider)!.push(execution);
            }

            // Process executions for each provider up to their limits
            for (const [provider, executions] of executionsByProvider) {
                const limit = this.providerConcurrencyLimits.get(provider) || 1;
                const toProcess = executions.slice(0, limit);

                for (const execution of toProcess) {
                    if (execution.id) {
                        console.log(`Resuming interrupted execution: ${execution.id} (provider: ${provider})`);
                        // Process without changing status since it's already running
                        this.processExecution(execution.id).catch(error => {
                            console.error(`Error resuming execution ${execution.id}:`, error);
                        });
                    }
                }
            }
        }
    }

    /**
     * Start polling the database for work
     */
    private startPolling(): void {
        if (this.pollingInterval) {
            return; // Already polling
        }

        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForWork();
            } catch (error) {
                console.error('Error during polling:', error);
            }
        }, this.POLL_INTERVAL_MS);

        console.log(`Started polling for executions every ${this.POLL_INTERVAL_MS}ms`);
    }

    /**
     * Stop polling for work
     */
    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('Stopped polling for executions');
        }
    }

    /**
     * Poll the database for work and process executions per provider
     */
    private async pollForWork(): Promise<void> {
        // Get all pending executions
        const pendingExecutions = await executionModel.findByStatus('pending');

        if (pendingExecutions.length === 0) {
            return; // No work to do
        }

        // Group pending executions by provider
        const executionsByProvider = new Map<AIProviderName, Execution[]>();
        for (const execution of pendingExecutions) {
            if (!executionsByProvider.has(execution.provider)) {
                executionsByProvider.set(execution.provider, []);
            }
            executionsByProvider.get(execution.provider)!.push(execution);
        }

        // Process executions for each provider in parallel
        const processingPromises: Promise<void>[] = [];

        for (const [provider, executions] of executionsByProvider) {
            processingPromises.push(this.processProviderExecutions(provider, executions));
        }

        // Wait for all providers to process their executions
        await Promise.all(processingPromises);
    }

    /**
     * Process executions for a specific provider
     */
    private async processProviderExecutions(provider: AIProviderName, executions: Execution[]): Promise<void> {
        // Get current running count for this provider using optimized query
        const runningExecutions = await executionModel.getRunningExecutionsByProvider(provider);
        const providerRunningCount = runningExecutions.length;

        // Get concurrency limit for this provider
        const concurrencyLimit = this.providerConcurrencyLimits.get(provider) || 1;

        if (providerRunningCount >= concurrencyLimit) {
            return; // Provider at capacity
        }

        // Calculate available slots for this provider
        const availableSlots = concurrencyLimit - providerRunningCount;
        const executionsToProcess = executions.slice(0, availableSlots);

        if (executionsToProcess.length > 0) {
            console.log(`Processing ${executionsToProcess.length} pending executions for provider ${provider} (${providerRunningCount} currently running, limit: ${concurrencyLimit})`);

            // Process executions for this provider
            for (const execution of executionsToProcess) {
                if (execution.id) {
                    this.processExecution(execution.id).catch(error => {
                        console.error(`Error processing execution ${execution.id}:`, error);
                    });
                }
            }
        }
    }

    /**
     * Set concurrency limit for a specific provider
     */
    public setProviderConcurrencyLimit(provider: AIProviderName, limit: number): void {
        if (limit < 1) {
            throw new Error('Provider concurrency limit must be at least 1');
        }
        this.providerConcurrencyLimits.set(provider, limit);
        console.log(`Set concurrency limit for provider ${provider} to: ${limit}`);
    }

    /**
     * Get concurrency limit for a specific provider
     */
    public getProviderConcurrencyLimit(provider: AIProviderName): number {
        return this.providerConcurrencyLimits.get(provider) || 1;
    }

    /**
     * Get all provider concurrency limits
     */
    public getAllProviderConcurrencyLimits(): Record<string, number> {
        return Object.fromEntries(this.providerConcurrencyLimits);
    }

    /**
     * Validate execution result against JSON schema
     */
    private validateExecutionResult(result: any, jsonSchema?: JSONSchema): {
        result_valid: boolean;
        result_validation_message?: string
    } {
        let v = promptService.validateData(result, jsonSchema)

        return {
            result_valid: v.valid,
            ...(v.validation_message && { result_validation_message: v.validation_message })
        }
    }

    /**
     * Process a single execution
     */
    private async processExecution(executionId: string): Promise<void> {
        let status: Execution['status']
        // Get execution
        const execution = await executionModel.findById(executionId);
        if (!execution) {
            console.error(`Execution not found: ${executionId}`);
            return;
        }
        try {

            // Skip if not pending or running (interrupted executions)
            if (execution.status !== 'pending' && execution.status !== 'running') {
                console.warn(`Execution ${executionId} is not in processable state, current status: ${execution.status}`);
                return;
            }

            // Update status to running (if not already running)
            if (execution.status === 'pending') {
                await executionModel.updateStatus(executionId, 'running');
            } else {
                console.log(`Resuming interrupted execution ${executionId} with status: ${execution.status}`);
            }

            // Determine prompt text and schema to use
            let promptText: string;
            let jsonSchemaResponse: any = undefined;

            if (execution.prompt_text) {
                // Use direct prompt text
                promptText = execution.prompt_text;
                // No schema validation for direct prompt text
            } else if (execution.prompt_id && execution.prompt_version !== undefined) {
                // Use prompt from database
                const prompt = await promptModel.findById(execution.prompt_id);
                if (!prompt) {
                    await executionModel.updateStatus(executionId, 'failed', {
                        error_message: `Prompt not found: ${execution.prompt_id}`
                    });
                    return;
                }

                // Get the specific version to execute
                const promptVersion = promptModel.getVersion(prompt, execution.prompt_version);
                if (!promptVersion) {
                    await executionModel.updateStatus(executionId, 'failed', {
                        error_message: `Prompt version ${execution.prompt_version} not found`
                    });
                    return;
                }

                promptText = promptVersion.prompt;
                jsonSchemaResponse = promptVersion.json_schema_response;
            } else {
                await executionModel.updateStatus(executionId, 'failed', {
                    error_message: 'Either prompt_text or both prompt_id and prompt_version must be provided'
                });
                return;
            }

            // Get provider
            const provider = providerRegistry.getProvider(execution.provider);
            if (!provider) {
                await executionModel.updateStatus(executionId, 'failed', {
                    error_message: `Provider not found: ${execution.provider}`
                });
                return;
            }

            let options: ExecutionOptions = { ...execution.options }
            if (jsonSchemaResponse) {
                options.schema = jsonSchemaResponse as JSONSchema
            }

            // Handle file upload if fileId is present and provider supports it
            if (execution.fileId && provider.supportsFileUpload()) {
                try {
                    const file = await fileModel.findById(execution.fileId);
                    if (!file) {
                        await executionModel.updateStatus(executionId, 'failed', {
                            error_message: `File not found: ${execution.fileId}`
                        });
                        return;
                    }

                    // Add file to options
                    const fileAttachment: FileAttachment = {
                        name: file.name,
                        mimeType: file.mimeType,
                        dataBase64: file.data,
                        size: file.size
                    };

                    options.files = [fileAttachment];
                    console.log(`Added file ${file.name} (${file.mimeType}) to execution ${executionId}`);
                } catch (error) {
                    await executionModel.updateStatus(executionId, 'failed', {
                        error_message: `Failed to fetch file ${execution.fileId}: ${error instanceof Error ? error.message : String(error)}`
                    });
                    return;
                }
            } else if (execution.fileId && !provider.supportsFileUpload()) {
                await executionModel.updateStatus(executionId, 'failed', {
                    error_message: `Provider ${execution.provider} does not support file uploads`
                });
                return;
            }

            // Execute the prompt using the extracted prompt text
            const result = await provider.execute(
                promptText,
                execution.user_input,
                execution.model,
                options
            );

            let vr: {
                result_valid: boolean;
                result_validation_message?: string
            } = {
                result_valid: true
            }

            let parsedOutput: object = {}
            let resultOutput: string
            if (jsonSchemaResponse) {
                try {
                    parsedOutput = JSON.parse(result.output)
                    // Clean the output by removing null values
                    const cleanedOutput = this.removeNullValues(parsedOutput);

                    // Validate the result
                    vr = this.validateExecutionResult(
                        cleanedOutput,
                        jsonSchemaResponse as JSONSchema
                    );
                    resultOutput = vr.result_valid ? JSON.stringify(cleanedOutput, null, "\t") : result.output
                } catch (e) {
                    vr.result_valid = false
                    vr.result_validation_message = "Incorrect JSON"
                    resultOutput = result.output
                }
            } else {
                resultOutput = result.output
            }
            status = 'completed'
            // Update with result and validation
            await executionModel.updateStatus(executionId, status, {
                result: resultOutput, // null values has been removed
                input_tokens_used: result.inputTokensUsed,
                output_tokens_used: result.outputTokensUsed,
                ...vr
            });

            console.log(`Execution ${executionId} completed successfully`);

        } catch (error) {
            console.error(`Execution ${executionId} failed:`, error);

            let errorMessage = 'Unknown error occurred';
            if (error instanceof ProviderError) {
                errorMessage = `${error.name}: ${error.message}`;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            status = 'failed'
            await executionModel.updateStatus(executionId, status, {
                error_message: errorMessage
            });
        }

        if (execution.webhookDestinationIds) {
            for (let w of execution.webhookDestinationIds) {
                await Scheduler.sendWithRetryConfig('webhook-delivery', {
                    webhookId: w,
                    data: {
                        event: "webhook.deployment.execution",
                        executionId,
                        status
                    }
                }, {
                    maxAttempts: 8,
                    retryBackoffMultiplier: 5,
                    retryDelayMs: 5000
                })
            }
        }
    }

    /**
     * Shutdown the service and stop polling
     */
    public shutdown(): void {
        this.stopPolling();
        this.isInitialized = false;
        console.log('ExecutionService shutdown completed');
    }

    /**
     * Recursively remove properties with null values from an object
     */
    private removeNullValues(obj: object): object | null {
        // If not an object or is null, return as is
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        // If it's an array, process each element
        if (Array.isArray(obj)) {
            return obj
                .map(item => this.removeNullValues(item))
                .filter(item => item !== null);
        }

        // If it's an object, process its properties
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = this.removeNullValues(value);

            // Only add non-null values
            if (cleanedValue !== null &&
                (typeof cleanedValue !== 'object' ||
                    (Object.keys(cleanedValue).length > 0 && cleanedValue !== null))) {
                result[key] = cleanedValue;
            }
        }

        // Return the object if it has properties, otherwise null
        return Object.keys(result).length > 0 ? result : null;
    }
}

// Export singleton instance
export const executionWorker = ExecutionWorker.getInstance();
