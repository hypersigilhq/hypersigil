import { AIProvider, ProviderConfig, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ModelNotSupportedError, ExecutionOptions, JSONSchema, ExecutionResult, GenericProvider } from './base-provider';

// OpenAI Provider using the Responses API (/v1/responses)
// Migrated from Chat Completions API for better structured data handling and reasoning model support

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
    input?: string | OpenAIMessage[];
    instructions?: string;
    reasoning?: {
        effort: 'low' | 'medium' | 'high';
    };
    max_output_tokens?: number;
    text?: {
        format?: {
            type: 'json_schema';
        } | { name: string, type: 'json_schema', schema: any, strict: boolean };
        // } | { name: string, description: string, schema: any, strict: boolean };
        // } | { type: 'json_schema', schema: any, struct: boolean };
    };
    tools?: Array<{ type: 'web_search' }>;
}

interface OpenAIResponse {
    id: string;
    object: 'response';
    created: number;
    model: string;
    output: Array<{
        id: string;
        type: 'message';
        role: 'assistant';
        content: Array<{
            type: 'output_text';
            text: string;
            annotations: any[];
        }>;
    }>;
    usage: {
        input_tokens: number;
        output_tokens: number;
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

        // Build input for Responses API
        const systemPrompt = options?.schema ? this.buildPromptWithSchema(prompt, options.schema) : prompt;

        const requestBody: OpenAIRequest = {
            model,
            input: userInput,
            instructions: systemPrompt,
            // reasoning: {
            //     effort: options?.temperature && options.temperature < 0.3 ? 'low' :
            //         options?.temperature && options.temperature > 0.7 ? 'high' : 'medium'
            // },
            max_output_tokens: options?.maxTokens || 4096,
            ...(options?.webSearch && {
                tools: [{ type: 'web_search' }]
            }),
            ...(options?.schema && {
                text: {
                    format: {
                        type: 'json_schema',
                        name: "schema-name",
                        schema: this.sanitizeSchemaForOpenAI(options.schema),
                        strict: true
                    }
                }
            })
        };

        try {
            const response = await this.makeRequest('/v1/responses', {
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

            if (!result.output || result.output.length === 0) {
                throw new ProviderError(
                    'OpenAI API returned no output',
                    this.name,
                    'NO_OUTPUT'
                );
            }

            const output = result.output[0];
            if (!output || !output.content || output.content.length === 0) {
                throw new ProviderError(
                    'OpenAI API returned empty content',
                    this.name,
                    'EMPTY_CONTENT'
                );
            }

            // Find the text content in the output
            const textContent = output.content.find(item => item.type === 'output_text');
            if (!textContent || !textContent.text) {
                throw new ProviderError(
                    'OpenAI API returned no text content',
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
        return true; // OpenAI supports structured output through text.format in Responses API
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

    supportsFileUpload(): boolean {
        return false; // OpenAI supports file uploads through vision API
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

    /**
     * Sanitize JSON schema for OpenAI Responses API compatibility
     * OpenAI requires all properties to be listed in the 'required' array for json_schema format
     */
    private sanitizeSchemaForOpenAI(schema: JSONSchema): any {
        if (!schema || typeof schema !== 'object') {
            return schema;
        }

        const sanitized: any = {};

        // Copy supported fields
        if (schema.type) sanitized.type = schema.type;
        if (schema.description) sanitized.description = schema.description;
        if (schema.enum) sanitized.enum = schema.enum;

        // Handle properties and ensure all are required
        if (schema.properties) {
            sanitized.properties = {};
            const requiredKeys: string[] = [];

            for (const [key, value] of Object.entries(schema.properties)) {
                sanitized.properties[key] = this.sanitizeSchemaForOpenAI(value as JSONSchema);
                requiredKeys.push(key);
            }

            // Ensure all properties are in the required array
            sanitized.required = requiredKeys;
        }

        // Handle existing required field if present (merge with auto-generated)
        if (schema.required && Array.isArray(schema.required)) {
            if (!sanitized.required) {
                sanitized.required = [];
            }
            // Add any additional required fields that weren't in properties
            for (const req of schema.required) {
                if (!sanitized.required.includes(req)) {
                    sanitized.required.push(req);
                }
            }
        }

        // Handle array items
        if (schema.items) {
            sanitized.items = this.sanitizeSchemaForOpenAI(schema.items as JSONSchema);
        }

        // Basic validation fields
        if (typeof schema.minimum === 'number') sanitized.minimum = schema.minimum;
        if (typeof schema.maximum === 'number') sanitized.maximum = schema.maximum;
        if (typeof schema.minLength === 'number') sanitized.minLength = schema.minLength;
        if (typeof schema.maxLength === 'number') sanitized.maxLength = schema.maxLength;
        if (schema.pattern) sanitized.pattern = schema.pattern;
        if (schema.format) sanitized.format = schema.format;

        // Handle additional properties
        if (schema.additionalProperties !== undefined) {
            sanitized.additionalProperties = schema.additionalProperties;
        }

        return sanitized;
    }
}
