import { AIProvider, ProviderConfig, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ModelNotSupportedError, ExecutionOptions, JSONSchema, ExecutionResult, GenericProvider } from './base-provider';

export interface DeepInfraConfig extends ProviderConfig {
    apiKey: string;
    baseUrl: string;
    timeout: number;
}

interface DeepInfraMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface DeepInfraRequest {
    model: string;
    messages: DeepInfraMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    response_format?: {
        type: 'json_object';
    } | { type: 'json_schema', json_schema: { name: string, description: string, schema: any, strict: boolean } };
}

interface DeepInfraResponse {
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
        estimated_cost: number;
    };
}


export class DeepInfraProvider extends GenericProvider implements AIProvider {
    public readonly name = 'deepinfra';
    private config: DeepInfraConfig;

    // Hardcoded models for DeepInfra
    private readonly supportedModels = [
        'Qwen/Qwen3-235B-A22B-Instruct-2507',
        'Qwen/Qwen2.5-72B-Instruct',
        'zai-org/GLM-4.7-Flash',
        'deepseek-ai/DeepSeek-V3.2',
        'allenai/Olmo-3.1-32B-Instruct',
        'openai/gpt-oss-120b'
    ];

    constructor(config: Partial<DeepInfraConfig> = {}) {
        super()
        this.config = {
            name: 'deepinfra',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || 'https://api.deepinfra.com',
            timeout: config.timeout || 240_000,
            maxRetries: config.maxRetries || 3,
            ...config
        };
    }

    async execute(prompt: string, userInput: string, model: string, options?: ExecutionOptions): Promise<ExecutionResult> {
        if (!this.config.apiKey) {
            throw new ProviderUnavailableError(this.name, 'API key not configured');
        }

        // Validate model is supported
        if (!this.supportedModels.includes(model)) {
            throw new ModelNotSupportedError(this.name, model);
        }

        // Build messages array
        const messages: DeepInfraMessage[] = [
            {
                role: 'system',
                content: options?.schema ? this.buildPromptWithSchema(prompt, options.schema) : prompt
            },
            {
                role: 'user',
                content: userInput
            }
        ];

        const requestBody: DeepInfraRequest = {
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens || 4096,
            top_p: options?.topP ?? 0.9,
            ...(options?.schema && {
                response_format: { type: 'json_object' }
            })
        };

        try {
            const response = await this.makeRequest('/v1/openai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `DeepInfra API error: ${response.status} ${response.statusText}`;

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

            const result = await response.json() as DeepInfraResponse;

            if (!result.choices || result.choices.length === 0) {
                throw new ProviderError(
                    'DeepInfra API returned no choices',
                    this.name,
                    'NO_CHOICES'
                );
            }

            const choice = result.choices[0];
            if (!choice || !choice.message?.content) {
                throw new ProviderError(
                    'DeepInfra API returned empty content',
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
                    throw new ProviderUnavailableError(this.name, 'Cannot connect to DeepInfra API');
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
            // Test availability with a simple request to the chat completions endpoint
            const response = await this.makeRequest('/v1/openai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.supportedModels[0],
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                }),
            });
            return response.status !== 401 && response.status !== 403; // Not auth errors
        } catch (error) {
            return false;
        }
    }

    async getSupportedModels(): Promise<string[]> {
        // Return hardcoded models since DeepInfra has a fixed set
        return [...this.supportedModels];
    }

    supportsStructuredOutput(): boolean {
        return true; // DeepInfra supports structured output through response_format
    }

    updateConfig(config: Partial<DeepInfraConfig>): void {
        this.config = {
            ...this.config,
            ...config
        };
    }

    supportsFileUpload(): boolean {
        return false; // DeepInfra does not support file uploads yet
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