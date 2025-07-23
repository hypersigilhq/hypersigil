import { executionModel, Execution } from '../models/execution';
import { promptModel, PromptVersion } from '../models/prompt';
import { executionBundleModel } from '../models/execution-bundle';
import { providerRegistry } from '../providers/provider-registry';
import { ProviderError, ExecutionOptions, JSONSchema, ExecutionResult } from '../providers/base-provider';
import { testDataGroupModel, TestDataItem, testDataItemModel } from '../models';
import { promptService } from './prompt-service';

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
                let vr = promptService.validateData(JSON.parse(request.userInput), <JSONSchema>promptVersion.json_schema_input)
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


}

// Export singleton instance
export const executionService = new ExecutionService()
