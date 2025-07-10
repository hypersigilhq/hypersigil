import { executionModel, Execution } from '../models/execution';
import { promptModel } from '../models/prompt';
import { providerRegistry } from '../providers/provider-registry';
import { ProviderError, ExecutionOptions, JSONSchema, ExecutionResult } from '../providers/base-provider';

export interface CreateExecutionRequest {
    promptId: string;
    promptVersion?: number;
    userInput: string;
    providerModel: string; // Format: "provider:model" e.g., "ollama:qwen2.5:6b"
    options?: ExecutionOptions;

    testDataGroupId?: string
    testDataItemId?: string
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
    public async createExecution(request: CreateExecutionRequest): Promise<Execution> {
        // Validate prompt exists
        const prompt = await promptModel.findById(request.promptId);
        if (!prompt) {
            throw new Error(`Prompt not found: ${request.promptId}`);
        }

        // Determine version to execute
        const versionToExecute = request.promptVersion || prompt.current_version || 1;

        // Validate version exists
        const promptVersion = promptModel.getVersion(prompt, versionToExecute);
        if (!promptVersion) {
            throw new Error(`Prompt version ${versionToExecute} not found`);
        }

        // Parse and validate provider:model format
        const { provider: providerName, model } = providerRegistry.parseProviderModel(request.providerModel);

        // Create execution record
        const executionData: Omit<Execution, 'id' | 'created_at' | 'updated_at'> = {
            prompt_id: request.promptId,
            prompt_version: versionToExecute,
            user_input: request.userInput,
            provider: providerName,
            model: model,
            status: 'pending',
            test_data_group_id: request.testDataGroupId,
            test_data_item_id: request.testDataItemId,
        };

        if (request.options) {
            executionData.options = request.options;
        }

        const execution = await executionModel.create(executionData);

        // Execution will be picked up by the polling mechanism
        console.log(`Created execution ${execution.id} for prompt version ${versionToExecute} - will be processed by polling`);

        return execution;
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
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
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

            // Get prompt
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

            // Get provider
            const provider = providerRegistry.getProvider(execution.provider);
            if (!provider) {
                await executionModel.updateStatus(executionId, 'failed', {
                    error_message: `Provider not found: ${execution.provider}`
                });
                return;
            }

            // Execute the prompt using the specific version
            const result = await provider.execute(
                promptVersion.prompt,
                execution.user_input,
                execution.model,
                { schema: promptVersion.json_schema_response as JSONSchema, ...execution.options }
            );

            // Update with result
            await executionModel.updateStatus(executionId, 'completed', {
                result: result.output,
                input_tokens_used: result.inputTokensUsed,
                output_tokens_used: result.outputTokensUsed
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
}

// Export singleton instance
export const executionService = ExecutionService.getInstance();
