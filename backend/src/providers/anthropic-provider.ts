import { AIProvider, ProviderConfig, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ModelNotSupportedError, ExecutionOptions, JSONSchema, ExecutionResult, GenericProvider, FileAttachment } from './base-provider';

export interface AnthropicConfig extends ProviderConfig {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    version: string;
}

interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | Array<{
        type: 'text' | 'image' | 'document';
        text?: string;
        source?: {
            type: 'base64';
            media_type: string;
            data: string;
        };
    }>;
}

interface AnthropicRequest {
    model: string;
    max_tokens: number;
    messages: AnthropicMessage[];
    system?: string;
    temperature?: number;
    top_p?: number;
}

interface AnthropicResponse {
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

interface AnthropicModel {
    id: string;
    type: 'model';
    display_name: string;
    created_at: string;
}

interface AnthropicModelsResponse {
    data: AnthropicModel[];
    has_more: boolean;
    first_id?: string;
    last_id?: string;
}

export class AnthropicProvider extends GenericProvider implements AIProvider {
    public readonly name = 'anthropic';
    private config: AnthropicConfig;
    private modelsCache: string[] | null = null;
    private modelsCacheExpiry: number = 0;
    private readonly modelsCacheTTL = 5 * 60 * 1000; // 5 minutes

    constructor(config: Partial<AnthropicConfig> = {}) {
        super()
        this.config = {
            name: 'anthropic',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || 'https://api.anthropic.com',
            timeout: config.timeout || 240_000,
            version: config.version || '2023-06-01',
            maxRetries: config.maxRetries || 3,
            ...config
        };
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

        // Build system prompt with schema instructions if provided
        let systemPrompt = prompt;
        if (options?.schema) {
            systemPrompt = this.buildPromptWithSchema(prompt, options.schema);
        }

        // Build user message with file attachments if provided
        let userMessage: string | Array<{ type: 'text' | 'image' | 'document'; text?: string; source?: { type: 'base64'; media_type: string; data: string } }>;

        if (options?.files && options.files.length > 0) {
            const userContent: Array<{ type: 'text' | 'image' | 'document'; text?: string; source?: { type: 'base64'; media_type: string; data: string } }> = [
                { type: 'text', text: userInput }
            ];

            // Process file attachments
            for (const file of options.files) {
                if (file.mimeType.startsWith('image/')) {
                    // Add image attachments for vision models
                    userContent.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: file.mimeType,
                            data: file.dataBase64
                        }
                    });
                } else if (file.mimeType === 'application/pdf' ||
                    file.mimeType === 'text/plain' ||
                    file.mimeType === 'text/csv' ||
                    file.mimeType === 'application/json' ||
                    file.mimeType === 'text/markdown' ||
                    file.mimeType.startsWith('text/')) {
                    // Use document type for PDFs and text-based documents
                    userContent.push({
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: file.mimeType,
                            data: file.dataBase64
                        }
                    });
                } else {
                    // For unsupported file types, add as document and let Anthropic handle it
                    userContent.push({
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: file.mimeType,
                            data: file.dataBase64
                        }
                    });
                }
            }

            userMessage = userContent;
        } else {
            userMessage = userInput;
        }

        const requestBody: AnthropicRequest = {
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
                let errorMessage = `Anthropic API error: ${response.status} ${response.statusText}`;

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

            const result = await response.json() as AnthropicResponse;

            if (!result.content || result.content.length === 0) {
                throw new ProviderError(
                    'Anthropic API returned empty response',
                    this.name,
                    'EMPTY_RESPONSE'
                );
            }

            // Extract text from the first content block
            const textContent = result.content.find(block => block.type === 'text');
            if (!textContent) {
                throw new ProviderError(
                    'Anthropic API returned no text content',
                    this.name,
                    'NO_TEXT_CONTENT'
                );
            }

            return {
                output: textContent.text,
                inputTokensUsed: result.usage.input_tokens,
                outputTokensUsed: result.usage.output_tokens
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
                    throw new ProviderUnavailableError(this.name, 'Cannot connect to Anthropic API');
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

            const data = await response.json() as AnthropicModelsResponse;
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
        return true; // Anthropic supports structured output through prompt engineering
    }

    supportsFileUpload(): boolean {
        return true; // Anthropic supports file uploads through vision API
    }

    updateConfig(config: Partial<AnthropicConfig>): void {
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
