import { executionModel, Execution } from '../models/execution';
import { promptModel } from '../models/prompt';
import { providerRegistry } from '../providers/provider-registry';
import { ProviderError } from '../providers/base-provider';

export interface CreateExecutionRequest {
    promptId: string;
    userInput: string;
    providerModel: string; // Format: "provider:model" e.g., "ollama:qwen2.5:6b"
}

export class ExecutionService {
    private static instance: ExecutionService;
    private processingQueue: Set<string> = new Set();

    private constructor() { }

    public static getInstance(): ExecutionService {
        if (!ExecutionService.instance) {
            ExecutionService.instance = new ExecutionService();
        }
        return ExecutionService.instance;
    }

    /**
     * Create a new execution and queue it for processing
     */
    public async createExecution(request: CreateExecutionRequest): Promise<Execution> {
        // Validate prompt exists
        const prompt = await promptModel.findById(request.promptId);
        if (!prompt) {
            throw new Error(`Prompt not found: ${request.promptId}`);
        }

        // Parse and validate provider:model format
        const { provider: providerName, model } = providerRegistry.parseProviderModel(request.providerModel);

        // Create execution record
        const execution = await executionModel.create({
            prompt_id: request.promptId,
            user_input: request.userInput,
            provider: providerName,
            model: model,
            status: 'pending'
        });

        // Queue for processing (fire and forget)
        this.queueExecution(execution.id!);

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
     * Queue an execution for processing
     */
    private queueExecution(executionId: string): void {
        if (this.processingQueue.has(executionId)) {
            return; // Already queued
        }

        this.processingQueue.add(executionId);

        // Process asynchronously
        setImmediate(() => {
            this.processExecution(executionId).finally(() => {
                this.processingQueue.delete(executionId);
            });
        });
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

            // Skip if not pending
            if (execution.status !== 'pending') {
                console.warn(`Execution ${executionId} is not pending, current status: ${execution.status}`);
                return;
            }

            // Update status to running
            await executionModel.updateStatus(executionId, 'running');

            // Get prompt
            const prompt = await promptModel.findById(execution.prompt_id);
            if (!prompt) {
                await executionModel.updateStatus(executionId, 'failed', {
                    error_message: `Prompt not found: ${execution.prompt_id}`
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

            // Execute the prompt
            const result = await provider.execute(
                prompt.prompt,
                execution.user_input,
                execution.model
            );

            // Update with result
            await executionModel.updateStatus(executionId, 'completed', {
                result: result
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
     * Process pending executions (can be called by a background worker)
     */
    public async processPendingExecutions(limit: number = 5): Promise<void> {
        try {
            const pendingExecutions = await executionModel.getPendingExecutions(limit);

            for (const execution of pendingExecutions) {
                if (execution.id && !this.processingQueue.has(execution.id)) {
                    this.queueExecution(execution.id);
                }
            }
        } catch (error) {
            console.error('Error processing pending executions:', error);
        }
    }

    /**
     * Get processing queue status
     */
    public getQueueStatus(): {
        processing: number;
        queuedIds: string[];
    } {
        return {
            processing: this.processingQueue.size,
            queuedIds: Array.from(this.processingQueue)
        };
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
