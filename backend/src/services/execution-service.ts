import { executionModel, Execution } from '../models/execution';
import { promptModel, PromptVersion } from '../models/prompt';
import { executionBundleModel } from '../models/execution-bundle';
import { providerRegistry } from '../providers/provider-registry';
import { ProviderError, ExecutionOptions, JSONSchema, ExecutionResult } from '../providers/base-provider';
import Ajv from 'ajv';
import addFormats from "ajv-formats"
import { testDataGroupModel, TestDataItem, testDataItemModel } from '../models';
import * as mustache from 'mustache';

export interface CreateExecutionRequest {
    promptId?: string | undefined;
    promptVersion?: number;
    promptText?: string | undefined;
    userInput: string;
    providerModel: string; // Format: "provider:model" e.g., "ollama:qwen2.5:6b"
    options?: ExecutionOptions;

    testDataGroupId?: string
    testDataItemId?: string
    traceId?: string | undefined
    origin: Execution['origin']
}

export class ExecutionService {
    private static instance: ExecutionService;
    private maxConcurrentExecutions: number = 1; // Adjustable concurrency limit
    private isInitialized: boolean = false;
    private pollingInterval: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

    private constructor() { }

    public static getInstance(): ExecutionService {
        if (!ExecutionService.instance) {
            ExecutionService.instance = new ExecutionService();
        }
        return ExecutionService.instance;
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

            // Process interrupted executions up to concurrency limit
            const toProcess = runningExecutions.slice(0, this.maxConcurrentExecutions);

            for (const execution of toProcess) {
                if (execution.id) {
                    console.log(`Resuming interrupted execution: ${execution.id}`);
                    // Process without changing status since it's already running
                    this.processExecution(execution.id).catch(error => {
                        console.error(`Error resuming execution ${execution.id}:`, error);
                    });
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
     * Poll the database for work and process executions
     */
    private async pollForWork(): Promise<void> {
        // Check current running executions count
        const runningCount = await executionModel.count({ status: 'running' });

        if (runningCount >= this.maxConcurrentExecutions) {
            return; // At capacity
        }

        // Get available slots
        const availableSlots = this.maxConcurrentExecutions - runningCount;

        // Get pending executions to fill available slots
        const pendingExecutions = await executionModel.getPendingExecutions(availableSlots);

        if (pendingExecutions.length > 0) {
            console.log(`Processing ${pendingExecutions.length} pending executions (${runningCount} currently running)`);

            // Process each pending execution
            for (const execution of pendingExecutions) {
                if (execution.id) {
                    this.processExecution(execution.id).catch(error => {
                        console.error(`Error processing execution ${execution.id}:`, error);
                    });
                }
            }
        }
    }

    /**
     * Set the maximum number of concurrent executions
     */
    public setMaxConcurrentExecutions(max: number): void {
        if (max < 1) {
            throw new Error('Maximum concurrent executions must be at least 1');
        }
        this.maxConcurrentExecutions = max;
        console.log(`Set maximum concurrent executions to: ${max}`);
    }

    /**
     * Get the current maximum concurrent executions setting
     */
    public getMaxConcurrentExecutions(): number {
        return this.maxConcurrentExecutions;
    }

    /**
     * Create a new execution (will be picked up by polling)
     */
    public async createExecution(request: CreateExecutionRequest): Promise<Result<Execution>> {
        // Validate that either promptId or promptText is provided
        if (!request.promptId && !request.promptText) {
            return Err('Either promptId or promptText must be provided');
        }

        let versionToExecute: number | undefined;

        // If promptId is provided, validate prompt exists and get version info
        if (request.promptId) {
            const prompt = await promptModel.findById(request.promptId);
            if (!prompt) {
                return Err(`Prompt not found: ${request.promptId}`);
            }

            // Determine version to execute
            versionToExecute = request.promptVersion || prompt.current_version || 1;

            // Validate version exists
            const promptVersion = promptModel.getVersion(prompt, versionToExecute);
            if (!promptVersion) {
                return Err(`Prompt version ${versionToExecute} not found`);
            }

            if (request.promptId && promptVersion && promptVersion.json_schema_input) {
                let vr = this.validateData(JSON.parse(request.userInput), <JSONSchema>promptVersion.json_schema_input)
                if (!vr.valid) {
                    return Err(`Input data is not valid: ` + vr.validation_message)
                }
            }
        }

        // Parse and validate provider:model format
        const { provider: providerName, model } = providerRegistry.parseProviderModel(request.providerModel);


        // Create execution record
        const executionData: Omit<Execution, 'id' | 'created_at' | 'updated_at'> = {
            prompt_id: request.promptId,
            prompt_version: versionToExecute,
            prompt_text: request.promptText,
            user_input: request.userInput,
            provider: providerName,
            model: model,
            status: 'pending',
            test_data_group_id: request.testDataGroupId,
            test_data_item_id: request.testDataItemId,
            options: request.options,
            origin: request.origin,
            trace_id: request.traceId
        };

        const execution = await executionModel.create(executionData);

        // Execution will be picked up by the polling mechanism
        const logMessage = request.promptText
            ? `Created execution ${execution.id} with direct prompt text - will be processed by polling`
            : `Created execution ${execution.id} for prompt version ${versionToExecute} - will be processed by polling`;
        console.log(logMessage);

        return Ok(execution);
    }

    /**
     * Get execution by ID
     */
    public async getExecution(id: string): Promise<Execution | null> {
        return executionModel.findById(id);
    }

    /**
     * Get executions with filtering and pagination
     */
    public async getExecutions(options: {
        page: number;
        limit: number;
        status?: Execution['status'];
        provider?: string;
        promptId?: string;
        starred?: boolean;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
        ids?: string[];
    }) {
        return executionModel.findWithFilters(options);
    }

    /**
     * Get execution statistics
     */
    public async getExecutionStats() {
        return executionModel.getStats();
    }

    /**
     * Cancel a pending execution
     */
    public async cancelExecution(id: string): Promise<boolean> {
        const execution = await executionModel.findById(id);
        if (!execution) {
            return false;
        }

        if (execution.status !== 'pending') {
            throw new Error(`Cannot cancel execution with status: ${execution.status}`);
        }

        const updated = await executionModel.updateStatus(id, 'failed', {
            error_message: 'Execution cancelled by user'
        });

        return updated !== null;
    }


    /**
     * Process a single execution
     */
    /**
     * Validate execution result against JSON schema
     */
    private validateExecutionResult(result: any, jsonSchema?: JSONSchema): {
        result_valid: boolean;
        result_validation_message?: string
    } {
        let v = this.validateData(result, jsonSchema)

        return {
            result_valid: v.valid,
            ...(v.validation_message && { result_validation_message: v.validation_message })
        }
    }

    private validateData(data: any, jsonSchema?: JSONSchema): {
        valid: boolean;
        validation_message?: string
    } {
        // If no schema is provided, consider it valid
        if (!jsonSchema) {
            return { valid: true };
        }

        // Create Ajv instance
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv)

        try {
            // Compile the schema
            const validate = ajv.compile(jsonSchema);

            // Validate the result
            const valid = validate(data);

            if (valid) {
                return {
                    valid: true
                };
            } else {
                // Generate error message
                const errorDetails = validate.errors?.map(err =>
                    `${err.instancePath} ${err.message}`
                ).join('; ') + "; " + JSON.stringify(validate.errors) || 'Validation failed';
                console.log(errorDetails)
                return {
                    valid: false,
                    validation_message: errorDetails
                };
            }
        } catch (error: any) {
            console.error(error)
            return {
                valid: false,
                validation_message: error.message
            };
        }
    }

    // Removed convertJsonSchemaToZodSchema method as it's no longer needed

    private async processExecution(executionId: string): Promise<void> {
        try {
            // Get execution
            const execution = await executionModel.findById(executionId);
            if (!execution) {
                console.error(`Execution not found: ${executionId}`);
                return;
            }

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


            // Update with result and validation
            await executionModel.updateStatus(executionId, 'completed', {
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

            await executionModel.updateStatus(executionId, 'failed', {
                error_message: errorMessage
            });
        }
    }

    /**
     * Get current processing status
     */
    public async getProcessingStatus(): Promise<{
        running: number;
        pending: number;
        maxConcurrent: number;
    }> {
        const running = await executionModel.count({ status: 'running' });
        const pending = await executionModel.count({ status: 'pending' });

        return {
            running,
            pending,
            maxConcurrent: this.maxConcurrentExecutions
        };
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
     * Cleanup old executions
     */
    public async cleanupOldExecutions(olderThanDays: number = 30): Promise<number> {
        return executionModel.cleanupOldExecutions(olderThanDays);
    }

    /**
     * Create an execution bundle for a group of executions
     */
    public async createExecutionBundle(
        testDataGroupId: string,
        providerModels: string[],
        promptId: string,
        promptVersion?: number,
        options?: ExecutionOptions
    ): Promise<Result<string[]>> {
        const executionIds: string[] = [];

        for (let i in providerModels) {
            let providerModel = providerModels[i]!;
            // Check if test data group exists
            const group = await testDataGroupModel.findById(testDataGroupId);
            if (!group) {
                return Err('Test data group not found');
            }

            // Get all items in the group
            const items = await testDataItemModel.findByGroupId(testDataGroupId);
            if (items.length === 0) {
                return Err('Test data group is empty');
            }

            // Create executions for each item
            for (const item of items) {
                const executionData: any = {
                    promptId,
                    userInput: item.content,
                    providerModel,
                    origin: 'app' as const
                };

                if (promptVersion !== undefined) {
                    executionData.promptVersion = promptVersion;
                }

                if (options !== undefined) {
                    executionData.options = options;
                }

                const result = await this.createExecution(executionData);
                if (!result.success) {
                    return Err(result.error);
                }
                executionIds.push(result.data!.id!);

            }
        }

        // Create ExecutionBundle if executions were created successfully
        if (executionIds.length > 0 && testDataGroupId && promptId) {
            await executionBundleModel.create({
                test_group_id: testDataGroupId,
                execution_ids: executionIds,
                prompt_id: promptId,
            });
            console.log(`Created execution bundle for ${executionIds.length} executions`);
        }

        return Ok(executionIds);
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

    // Method to compile a prompt with test data using mustache
    public compilePromptVersion(testDataItem: TestDataItem, promptVersion: PromptVersion): { success: true; compiledPrompt: string } | { success: false; error: string } {
        const res = this.compilePrompt(testDataItem.content, promptVersion.prompt)
        if (!res.success) {
            return { success: false, error: res.error }
        }
        return { success: true, compiledPrompt: res.data }
    }

    public compilePrompt(data: string, prompt: string, inputSchema?: JSONSchema): Result<string> {
        // Parse the test data item content as JSON
        let input: any;
        try {
            input = JSON.parse(data);
        } catch (parseError) {
            return Err(`Invalid JSON in test data item content: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`)
        }

        if (inputSchema) {
            let valid = this.validateData(input, inputSchema)
            if (!valid.valid) {
                return Err(valid.validation_message || 'Error validating input')
            }
        }

        // Compile the prompt using mustache
        const compiledPrompt = mustache.render(prompt, input);
        return Ok(compiledPrompt)
    }
}

// Export singleton instance
export const executionService = ExecutionService.getInstance();
