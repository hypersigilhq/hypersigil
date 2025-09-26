import { AIProvider, ProviderConfig, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ModelNotSupportedError, ExecutionOptions, JSONSchema, ExecutionResult, GenericProvider, FileAttachment } from './base-provider';

export interface GeminiConfig extends ProviderConfig {
    apiKey: string;
    baseUrl: string;
    timeout: number;
}

interface GeminiMessage {
    role: 'user' | 'model';
    parts: Array<{
        text?: string;
        inline_data?: {
            mime_type: string;
            data: string;
        };
    }>;
}

interface GeminiRequest {
    contents: GeminiMessage[];
    generationConfig?: {
        temperature?: number;
        topP?: number;
        topK?: number;
        maxOutputTokens?: number;
        responseMimeType?: 'application/json';
        responseSchema?: any;
    };
}

interface GeminiResponse {
    candidates: Array<{
        content: {
            role: 'model';
            parts: Array<{
                text: string;
            }>;
        };
        finishReason: string;
    }>;
    usageMetadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}

interface GeminiModel {
    name: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
}

interface GeminiModelsResponse {
    models: GeminiModel[];
}

export class GeminiProvider extends GenericProvider implements AIProvider {
    public readonly name = 'gemini';
    private config: GeminiConfig;
    private modelsCache: string[] | null = null;
    private modelsCacheExpiry: number = 0;
    private readonly modelsCacheTTL = 5 * 60 * 1000; // 5 minutes

    constructor(config: Partial<GeminiConfig> = {}) {
        super()
        this.config = {
            name: 'gemini',
            apiKey: config.apiKey || '',
            baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com',
            timeout: config.timeout || 240_000,
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

        // Build contents array
        const contents: GeminiMessage[] = [];

        // Build user message with potential file attachments
        const userParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

        // Add user input text
        userParts.push({ text: userInput.length === 0 ? prompt : userInput });

        // Add file attachments if provided
        if (options?.files && options.files.length > 0) {
            for (const file of options.files) {
                if (file.mimeType.startsWith('image/')) {
                    // Add image attachments
                    userParts.push({
                        inline_data: {
                            mime_type: file.mimeType,
                            data: file.dataBase64
                        }
                    });
                } else if (file.mimeType === 'application/pdf' ||
                    file.mimeType === 'text/plain' ||
                    file.mimeType === 'text/csv' ||
                    file.mimeType === 'application/json' ||
                    file.mimeType === 'text/markdown' ||
                    file.mimeType.startsWith('text/')) {
                    // Add text-based documents
                    userParts.push({
                        inline_data: {
                            mime_type: file.mimeType,
                            data: file.dataBase64
                        }
                    });
                }
                // Skip unsupported file types
            }
        }

        if (userParts.length > 0) {
            contents.push({
                role: 'user',
                parts: userParts
            });
        }

        const requestBody: GeminiRequest = {
            contents,
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                topP: options?.topP ?? 0.9,
                topK: options?.topK ?? 40,
                maxOutputTokens: options?.maxTokens || 4096,
                ...(options?.schema && {
                    responseMimeType: 'application/json',
                    responseSchema: this.sanitizeSchemaForGemini(options.schema)
                })
            }
        };

        try {
            const response = await this.makeRequest(`/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Gemini API error: ${response.status} ${response.statusText}`;

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

            const result = await response.json() as GeminiResponse;

            if (!result.candidates || result.candidates.length === 0) {
                throw new ProviderError(
                    'Gemini API returned no candidates',
                    this.name,
                    'NO_CANDIDATES'
                );
            }

            const candidate = result.candidates[0];
            if (!candidate || !candidate.content?.parts || candidate.content.parts.length === 0) {
                throw new ProviderError(
                    'Gemini API returned empty content',
                    this.name,
                    'EMPTY_CONTENT'
                );
            }

            const textContent = candidate.content.parts.find(part => part.text);
            if (!textContent) {
                throw new ProviderError(
                    'Gemini API returned no text content',
                    this.name,
                    'NO_TEXT_CONTENT'
                );
            }

            return {
                output: textContent.text,
                inputTokensUsed: result.usageMetadata.promptTokenCount,
                outputTokensUsed: result.usageMetadata.candidatesTokenCount
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
                    throw new ProviderUnavailableError(this.name, 'Cannot connect to Gemini API');
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
            const response = await this.makeRequest('/v1beta/models', {
                method: 'GET',
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
            const response = await this.makeRequest('/v1beta/models', {
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

            const data = await response.json() as GeminiModelsResponse;

            // Filter to only generative models that support generateContent
            const generativeModels = data.models
                ?.filter(model =>
                    model.supportedGenerationMethods.includes('generateContent') &&
                    (model.name.includes('gemini') || model.name.includes('models/gemini'))
                )
                .map(model => model.name.replace('models/', '')) || [];

            // Cache the results
            this.modelsCache = generativeModels;
            this.modelsCacheExpiry = now + this.modelsCacheTTL;

            return generativeModels;
        } catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }

            throw new ProviderUnavailableError(this.name, 'Cannot fetch available models');
        }
    }

    supportsStructuredOutput(): boolean {
        return true; // Gemini supports structured output through responseSchema
    }

    supportsFileUpload(): boolean {
        return true; // Gemini supports multimodal inputs (images, documents)
    }

    updateConfig(config: Partial<GeminiConfig>): void {
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
        const url = `${this.config.baseUrl}${endpoint}?key=${this.config.apiKey}`;

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

    /**
     * Sanitize JSON schema for Gemini API compatibility
     * Gemini's responseSchema only supports a subset of JSON Schema fields
     */
    private sanitizeSchemaForGemini(schema: JSONSchema): any {
        if (!schema || typeof schema !== 'object') {
            return schema;
        }

        const sanitized: any = {};

        // Copy supported fields
        if (schema.type) {
            if (Array.isArray(schema.type)) {
                sanitized.type = schema.type[0];
            } else {
                sanitized.type = schema.type;
            }
        }
        if (schema.properties) {
            sanitized.properties = {};
            for (const [key, value] of Object.entries(schema.properties)) {
                sanitized.properties[key] = this.sanitizeSchemaForGemini(value);
            }
        }
        if (schema.required) sanitized.required = schema.required;
        if (schema.items) sanitized.items = this.sanitizeSchemaForGemini(schema.items);
        if (schema.enum) sanitized.enum = schema.enum;
        if (schema.description) sanitized.description = schema.description;

        // Basic validation fields that Gemini supports
        if (typeof schema.minimum === 'number') sanitized.minimum = schema.minimum;
        if (typeof schema.maximum === 'number') sanitized.maximum = schema.maximum;
        if (typeof schema.minLength === 'number') sanitized.minLength = schema.minLength;
        if (typeof schema.maxLength === 'number') sanitized.maxLength = schema.maxLength;

        // Recursively sanitize nested schemas
        if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
            // Convert additionalProperties object to properties if possible
            if (schema.additionalProperties.properties) {
                for (const [key, value] of Object.entries(schema.additionalProperties.properties)) {
                    if (!sanitized.properties) sanitized.properties = {};
                    sanitized.properties[key] = this.sanitizeSchemaForGemini(value);
                }
            }
        }

        return sanitized;
    }
}
