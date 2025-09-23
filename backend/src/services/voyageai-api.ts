import { settingsModel } from '../models/settings';
import { decryptString } from '../util/encryption';

export interface VoyageAIEmbeddingRequest {
    input: string | string[];
    model: 'voyage-3-large' | 'voyage-3.5' | 'voyage-3.5-lite' | 'voyage-code-3' | 'voyage-finance-2' | 'voyage-law-2';
    input_type?: 'query' | 'document' | null;
}

export interface VoyageAIEmbedding {
    object: 'embedding';
    embedding: number[];
    index: number;
}

export interface VoyageAIEmbeddingsResponse {
    object: 'list';
    data: VoyageAIEmbedding[];
    model: string;
    usage: {
        total_tokens: number;
    };
}

export interface VoyageAIEmbeddingsResult {
    embeddings: number[][];
    model: string;
    totalTokens: number;
}

class VoyageAIApiService {
    private readonly baseUrl = 'https://api.voyageai.com/v1/embeddings';

    /**
     * Generate vector embeddings for the given input using VoyageAI API
     */
    async generateEmbeddings(request: VoyageAIEmbeddingRequest): Promise<Result<VoyageAIEmbeddingsResult, string>> {
        // Get the active VoyageAI API key from settings
        const serviceKeys = await settingsModel.getServiceApiKeys();
        const voyageAiKey = serviceKeys.find(key => key.provider === 'voyageai' && key.active);

        if (!voyageAiKey) {
            return Err('VoyageAI API key not configured or inactive');
        }

        // Decrypt the API key
        const decryptedKey = decryptString(voyageAiKey.api_key);
        if (decryptedKey.err) {
            return Err('Failed to decrypt VoyageAI API key');
        }

        // Validate input
        if (!request.input || (Array.isArray(request.input) && request.input.length === 0)) {
            return Err('Input cannot be empty');
        }

        if (Array.isArray(request.input)) {
            const maxLength = 1000;
            if (request.input.length > maxLength) {
                return Err(`Input list cannot exceed ${maxLength} items`);
            }

            // Check token limits (rough estimate - this could be improved with actual tokenization)
            const estimatedTokens = request.input.reduce((sum, text) => sum + text.split(' ').length, 0);
            const maxTokens = this.getMaxTokensForModel(request.model);
            if (estimatedTokens > maxTokens) {
                return Err(`Estimated token count (${estimatedTokens}) exceeds limit (${maxTokens}) for model ${request.model}`);
            }
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${decryptedKey.data}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: request.input,
                    model: request.model,
                    ...(request.input_type && { input_type: request.input_type }),
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `VoyageAI API error: ${response.status} ${response.statusText}`;

                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error?.message) {
                        errorMessage += ` - ${errorData.error.message}`;
                    }
                } catch {
                    errorMessage += ` - ${errorText}`;
                }

                return Err(errorMessage);
            }

            const result = await response.json() as VoyageAIEmbeddingsResponse;

            // Extract embeddings from response
            const embeddings = result.data.map(item => item.embedding);

            return Ok({
                embeddings,
                model: result.model,
                totalTokens: result.usage.total_tokens,
            });

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    return Err('Request timeout');
                }
                if (error.message.includes('fetch')) {
                    return Err('Network error: Unable to connect to VoyageAI API');
                }
                return Err(`Unexpected error: ${error.message}`);
            }
            return Err('Unknown error occurred');
        }
    }

    /**
     * Get maximum token limit for a given model
     */
    private getMaxTokensForModel(model: string): number {
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
}

export const voyageAIApiService = new VoyageAIApiService();
