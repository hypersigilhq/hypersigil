import { AIProvider, ProviderConfig, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ModelNotSupportedError, ExecutionOptions, JSONSchema, ExecutionResult, GenericProvider } from './base-provider';

export interface OpenAIConfig extends ProviderConfig {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    organization?: string;
}

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAIRequest {
    model: string;
    messages: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    response_format?: {
        type: 'json_object';
    } | { type: 'json_schema', json_schema: { name: string, description: string, schema: any, strict: boolean } };
}

interface OpenAIResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: 'assistant';
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

interface OpenAIModel {
    id: string;
    object: 'model';
    created: number;
    owned_by: string;
}

interface OpenAIModelsResponse {
    object: 'list';
    data: OpenAIModel[];
}


export class OpenAIProvider extends GenericProvider implements AIProvider {
    public readonly name = 'openai';
    private config: OpenAIConfig;
    private modelsCache: string[] | null = null;
    private modelsCacheExpiry: number = 0;
    private readonly modelsCacheTTL = 5 * 60 * 1000; // 5 minutes

    constructor(config: Partial<OpenAIConfig> = {}) {
        super()
        this.config = {
            name: 'openai',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || 'https://api.openai.com',
            timeout: config.timeout || 240_000,
            maxRetries: config.maxRetries || 3,
            ...config
        };

        // Set organization separately to handle undefined properly
        if (config.organization) {
            this.config.organization = config.organization;
        }
    }

    async execute(prompt: string, userInput: string, model: string, options?: ExecutionOptions): Promise<ExecutionResult> {
        if (!this.config.apiKey) {
            throw new ProviderUnavailableError(this.name, 'API key not configured');
        }

        // Validate model is available
        const availableModels = await this.getSupportedModels();
        if (!availableModels.includes(model)) {
            throw new ModelNotSupportedError(this.name, model);
        }

        // Build messages array
        const messages: OpenAIMessage[] = [
            {
                role: 'system',
                content: options?.schema ? this.buildPromptWithSchema(prompt, options.schema) : prompt
                // content: prompt
            },
            {
                role: 'user',
                content: userInput
            }
        ];

        const requestBody: OpenAIRequest = {
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens || 4096,
            top_p: options?.topP ?? 0.9,
            ...(options?.schema && {
                response_format: { type: 'json_object' }
                // response_format: {
                //     type: 'json_schema', json_schema: {
                //         description: "Follow prompt and schema description",
                //         name: "Name",
                //         schema: options.schema,
                //         strict: true
                //     }
                // }
            })
        };

        try {
            const response = await this.makeRequest('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;

                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.error?.message) {
                        errorMessage += ` - ${errorData.error.message}`;
                    }
                } catch {
                    errorMessage += ` - ${errorText}`;
                }

                throw new ProviderError(
                    errorMessage,
                    this.name,
                    'API_ERROR',
                    response.status
                );
            }

            const result = await response.json() as OpenAIResponse;

            if (!result.choices || result.choices.length === 0) {
                throw new ProviderError(
                    'OpenAI API returned no choices',
                    this.name,
                    'NO_CHOICES'
                );
            }

            const choice = result.choices[0];
            if (!choice || !choice.message?.content) {
                throw new ProviderError(
                    'OpenAI API returned empty content',
                    this.name,
                    'EMPTY_CONTENT'
                );
            }

            return {
                output: choice.message.content,
                inputTokensUsed: result.usage.prompt_tokens,
                outputTokensUsed: result.usage.completion_tokens
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
                    throw new ProviderUnavailableError(this.name, 'Cannot connect to OpenAI API');
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
        if (!this.config.apiKey) {
            return false;
        }

        try {
            const response = await this.makeRequest('/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
                },
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getSupportedModels(): Promise<string[]> {
        if (!this.config.apiKey) {
            throw new ProviderUnavailableError(this.name, 'API key not configured');
        }

        // Check cache first
        const now = Date.now();
        if (this.modelsCache && now < this.modelsCacheExpiry) {
            return this.modelsCache;
        }

        try {
            const response = await this.makeRequest('/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    ...(this.config.organization && { 'OpenAI-Organization': this.config.organization }),
                },
            });

            if (!response.ok) {
                throw new ProviderError(
                    `Failed to fetch models: ${response.status} ${response.statusText}`,
                    this.name,
                    'MODELS_FETCH_ERROR',
                    response.status
                );
            }

            const data = await response.json() as OpenAIModelsResponse;
            // Filter to only chat completion models (exclude embeddings, etc.)
            const chatModels = data.data
                ?.filter(model =>
                    model.id.includes('gpt') ||
                    model.id.includes('o1') ||
                    model.id.includes('chatgpt')
                )
                .map(model => model.id) || [];

            // Cache the results
            this.modelsCache = chatModels;
            this.modelsCacheExpiry = now + this.modelsCacheTTL;

            return chatModels;
        } catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }

            throw new ProviderUnavailableError(this.name, 'Cannot fetch available models');
        }
    }

    supportsStructuredOutput(): boolean {
        return true; // OpenAI supports structured output through response_format
    }

    updateConfig(config: Partial<OpenAIConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
        // Clear models cache when config changes
        this.modelsCache = null;
        this.modelsCacheExpiry = 0;
    }

    getRequiredConfigKeys(): string[] {
        return ['apiKey'];
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
