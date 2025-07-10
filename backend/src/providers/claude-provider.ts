import { AIProvider, ProviderConfig, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ModelNotSupportedError, ExecutionOptions, JSONSchema } from './base-provider';

export interface ClaudeConfig extends ProviderConfig {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    version: string;
}

interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ClaudeRequest {
    model: string;
    max_tokens: number;
    messages: ClaudeMessage[];
    system?: string;
    temperature?: number;
    top_p?: number;
}

interface ClaudeResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<{
        type: 'text';
        text: string;
    }>;
    model: string;
    stop_reason: string;
    stop_sequence?: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

interface ClaudeModel {
    id: string;
    type: 'model';
    display_name: string;
    created_at: string;
}

interface ClaudeModelsResponse {
    data: ClaudeModel[];
    has_more: boolean;
    first_id?: string;
    last_id?: string;
}

export class ClaudeProvider implements AIProvider {
    public readonly name = 'claude';
    private config: ClaudeConfig;
    private modelsCache: string[] | null = null;
    private modelsCacheExpiry: number = 0;
    private readonly modelsCacheTTL = 5 * 60 * 1000; // 5 minutes

    constructor(config: Partial<ClaudeConfig> = {}) {
        this.config = {
            name: 'claude',
            apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
            baseUrl: config.baseUrl || 'https://api.anthropic.com',
            timeout: config.timeout || 240_000,
            version: config.version || '2023-06-01',
            maxRetries: config.maxRetries || 3,
            ...config
        };
    }

    async execute(prompt: string, userInput: string, model: string, options?: ExecutionOptions): Promise<string> {
        if (!this.config.apiKey) {
            throw new ProviderUnavailableError(this.name, 'API key not configured');
        }

        // Validate model is available
        const availableModels = await this.getSupportedModels();
        if (!availableModels.includes(model)) {
            throw new ModelNotSupportedError(this.name, model);
        }

        // Build system prompt with schema instructions if provided
        let systemPrompt = prompt;
        if (options?.schema) {
            systemPrompt = this.buildPromptWithSchema(prompt, options.schema);
        }

        // Build user message
        const userMessage = userInput;

        const requestBody: ClaudeRequest = {
            model,
            max_tokens: options?.maxTokens || 4096,
            messages: [
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            system: systemPrompt,
            temperature: options?.temperature ?? 0.7,
            top_p: options?.topP ?? 0.9
        };

        try {
            const response = await this.makeRequest('/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': this.config.version,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Claude API error: ${response.status} ${response.statusText}`;

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

            const result = await response.json() as ClaudeResponse;

            if (!result.content || result.content.length === 0) {
                throw new ProviderError(
                    'Claude API returned empty response',
                    this.name,
                    'EMPTY_RESPONSE'
                );
            }

            // Extract text from the first content block
            const textContent = result.content.find(block => block.type === 'text');
            if (!textContent) {
                throw new ProviderError(
                    'Claude API returned no text content',
                    this.name,
                    'NO_TEXT_CONTENT'
                );
            }

            return textContent.text;
        } catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ProviderTimeoutError(this.name, this.config.timeout);
                }

                if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
                    throw new ProviderUnavailableError(this.name, 'Cannot connect to Claude API');
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
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': this.config.version,
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
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': this.config.version,
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

            const data = await response.json() as ClaudeModelsResponse;
            const models = data.data?.map((model) => model.id) || [];

            // Cache the results
            this.modelsCache = models;
            this.modelsCacheExpiry = now + this.modelsCacheTTL;

            return models;
        } catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }

            throw new ProviderUnavailableError(this.name, 'Cannot fetch available models');
        }
    }

    supportsStructuredOutput(): boolean {
        return true; // Claude supports structured output through prompt engineering
    }

    private buildPromptWithSchema(prompt: string, schema: JSONSchema): string {
        const schemaString = JSON.stringify(schema, null, 2);

        return `${prompt}

Please respond with valid JSON that matches this exact schema:
${schemaString}

Important: Your response must be valid JSON only, without any additional text, explanations, or markdown formatting.`;
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
