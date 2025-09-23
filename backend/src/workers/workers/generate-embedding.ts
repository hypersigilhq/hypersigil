import { WorkerRegistry } from '../worker-registry';
import { WorkerContext } from '../types';
import { voyageAIApiService } from '../../services';

export type EmbeddingModels = 'voyage-3-large' | 'voyage-3.5' | 'voyage-3.5-lite' | 'voyage-code-3' | 'voyage-finance-2' | 'voyage-law-2'
export type EmbeddingInputType = 'query' | 'document' | null

export interface GenerateEmbeddingData {
    inputs: string | string[];
    model: EmbeddingModels;
    inputType?: EmbeddingInputType;
}

WorkerRegistry.register('generate-embedding', async (
    data: GenerateEmbeddingData,
    context: WorkerContext
): Promise<any> => {
    context.logger.info('Starting embedding generation', {
        inputCount: Array.isArray(data.inputs) ? data.inputs.length : 1,
        model: data.model,
        inputType: data.inputType,
    });

    // Validate input
    if (!data.inputs || (Array.isArray(data.inputs) && data.inputs.length === 0)) {
        context.terminate('Input cannot be empty');
        return;
    }

    if (Array.isArray(data.inputs)) {
        const maxLength = 1000;
        if (data.inputs.length > maxLength) {
            context.terminate(`Input list cannot exceed ${maxLength} items`);
            return;
        }

        // Rough token estimation (word count) for validation
        const estimatedTokens = data.inputs.reduce((sum, text) => sum + text.split(' ').length, 0);
        const maxTokens = getMaxTokensForModel(data.model);
        if (estimatedTokens > maxTokens) {
            context.terminate(`Estimated token count (${estimatedTokens}) exceeds limit (${maxTokens}) for model ${data.model}`);
            return;
        }
    }

    try {
        const result = await voyageAIApiService.generateEmbeddings({
            input: data.inputs,
            model: data.model,
            ...(data.inputType !== undefined && { input_type: data.inputType }),
        });

        if (result.success) {
            context.logger.info('Embedding generation completed successfully', {
                embeddingCount: result.data.embeddings.length,
                model: result.data.model,
                totalTokens: result.data.totalTokens,
            });

            return result.data;
        } else {
            // Handle API key or configuration errors - terminate job
            if (result.error.includes('API key') || result.error.includes('configured')) {
                context.terminate(`Configuration error: ${result.error}`);
                return;
            }

            // Handle input validation errors - terminate job
            if (result.error.includes('Input') || result.error.includes('token')) {
                context.terminate(`Input validation error: ${result.error}`);
                return;
            }

            // Handle network/API errors - schedule retry
            context.logger.error('Embedding generation failed, scheduling retry', {
                error: result.error,
                attempt: context.attempt,
            });

            throw new Error(`Embedding generation failed: ${result.error}`);
        }

    } catch (error) {
        if (error instanceof Error) {
            // Network or API errors - schedule retry
            if (error.message.includes('fetch') ||
                error.message.includes('network') ||
                error.message.includes('timeout') ||
                error.name === 'AbortError') {

                context.logger.warn('Network error during embedding generation, scheduling retry', {
                    error: error.message,
                    attempt: context.attempt,
                });

                throw new Error(`Network error: ${error.message}`);
            }

            // Other errors - terminate job
            context.logger.error('Unexpected error during embedding generation', {
                error: error.message,
                attempt: context.attempt,
            });

            context.terminate(`Unexpected error: ${error.message}`);
            return;
        }

        // Unknown error - terminate job
        context.logger.error('Unknown error during embedding generation', {
            error: String(error),
            attempt: context.attempt,
        });

        context.terminate('Unknown error occurred during embedding generation');
        return;
    }
});

/**
 * Get maximum token limit for a given model
 */
function getMaxTokensForModel(model: string): number {
    const limits: Record<string, number> = {
        'voyage-3.5-lite': 1000000, // 1M tokens
        'voyage-3.5': 320000,       // 320K tokens
        'voyage-2': 320000,         // 320K tokens
        'voyage-3-large': 120000,   // 120K tokens
        'voyage-code-3': 120000,    // 120K tokens
        'voyage-finance-2': 120000, // 120K tokens
        'voyage-law-2': 120000,     // 120K tokens
    };

    return limits[model] || 320000; // Default to 320K if unknown model
}
