import { AIProvider, ProviderConfig, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ModelNotSupportedError, ExecutionOptions, JSONSchema, ExecutionResult } from './base-provider';

export interface OllamaConfig extends ProviderConfig {
    baseUrl: string;
    timeout: number;
}

export class OllamaProvider implements AIProvider {
    public readonly name = 'ollama';
    private config: OllamaConfig;

    constructor(config: Partial<OllamaConfig> = {}) {
        this.config = {
            name: 'ollama',
            baseUrl: config.baseUrl || 'http://localhost:11434',
            timeout: config.timeout || 240_000,
            maxRetries: config.maxRetries || 3,
            ...config
        };
    }

    async execute(prompt: string, userInput: string, model: string, options?: ExecutionOptions): Promise<ExecutionResult> {
        // Validate model is available
        const availableModels = await this.getSupportedModels();
        if (!availableModels.includes(model)) {
            throw new ModelNotSupportedError(this.name, model);
        }

        // Combine prompt and user input
        let fullPrompt = this.buildFullPrompt(prompt, userInput);

        // Add JSON schema instructions if provided
        if (options?.schema) {
            fullPrompt = this.buildPromptWithSchema(fullPrompt, options.schema);
        }
        // console.log('fullPrompt', fullPrompt)
        const requestBody = {
            model,
            prompt: fullPrompt,
            stream: false,
            format: options?.schema,
            options: {
                temperature: options?.temperature ?? 0.7,
                top_p: options?.topP ?? 0.9,
                top_k: options?.topK ?? 40,
                ...(options?.maxTokens && { num_predict: options.maxTokens })
            }
        };

        try {
            const response = await this.makeRequest('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new ProviderError(
                    `Ollama API error: ${response.status} ${response.statusText} - ${errorText}`,
                    this.name,
                    'API_ERROR',
                    response.status
                );
            }

            const result = await response.json() as {
                response?: string;
                error?: string;
                done?: boolean;
                prompt_eval_count?: number;
                eval_count?: number;
            };

            if (result.error) {
                throw new ProviderError(
                    `Ollama execution error: ${result.error}`,
                    this.name,
                    'EXECUTION_ERROR'
                );
            }

            return {
                output: result.response || '',
                inputTokensUsed: result.prompt_eval_count || 0,
                outputTokensUsed: result.eval_count || 0
            };
        } catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ProviderTimeoutError(this.name, this.config.timeout);
                }

                if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                    throw new ProviderUnavailableError(this.name, 'Cannot connect to Ollama service');
                }
            }

            throw new ProviderError(
                `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
                this.name,
                'UNEXPECTED_ERROR'
            );
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            const response = await this.makeRequest('/api/tags', {
                method: 'GET',
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getSupportedModels(): Promise<string[]> {
        try {
            const response = await this.makeRequest('/api/tags', {
                method: 'GET',
            });

            if (!response.ok) {
                throw new ProviderError(
                    `Failed to fetch models: ${response.status} ${response.statusText}`,
                    this.name,
                    'MODELS_FETCH_ERROR',
                    response.status
                );
            }

            const data = await response.json() as {
                models?: Array<{ name: string;[key: string]: any }>;
            };
            return data.models?.map((model) => model.name) || [];
        } catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }

            throw new ProviderUnavailableError(this.name, 'Cannot fetch available models');
        }
    }

    supportsStructuredOutput(): boolean {
        return true; // Ollama supports structured output through prompt engineering
    }

    private buildFullPrompt(prompt: string, userInput: string): string {
        return `Context of your task: ${prompt}\n Your task: ${userInput}`
    }

    private buildPromptWithSchema(prompt: string, schema: JSONSchema): string {
        const schemaString = JSON.stringify(schema, null, 2);

        return `${prompt}`
    }

    private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
        const url = `${this.config.baseUrl}${endpoint}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}
