// JSON Schema type definition for structured responses
export interface JSONSchema {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
    properties?: Record<string, JSONSchema>;
    items?: JSONSchema;
    required?: string[];
    description?: string;
    enum?: any[];
    format?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    additionalProperties?: boolean | JSONSchema;
    [key: string]: any;
}

// File attachment interface for AI providers
export interface FileAttachment {
    name: string;
    mimeType: string;
    dataBase64: string; // base64 encoded file data
    size: number;
}

// Execution options for AI providers
export interface ExecutionOptions {
    schema?: JSONSchema | undefined;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    files?: FileAttachment[];
    [key: string]: any;
}

// Execution result interface
export interface ExecutionResult {
    output: string;
    inputTokensUsed: number;
    outputTokensUsed: number;
}

export const AIProviderNames = ['ollama', 'openai', 'anthropic', 'gemini'] as const
export type AIProviderName = typeof AIProviderNames[number]

// Base interface for AI providers
export interface AIProvider {
    name: AIProviderName;
    execute(prompt: string, userInput: string, model: string, options?: ExecutionOptions): Promise<ExecutionResult>;
    isAvailable(): Promise<boolean>;
    getSupportedModels(): Promise<string[]>;
    supportsStructuredOutput?(): boolean;
    supportsFileUpload(): boolean;
    updateConfig(config: Partial<ProviderConfig>): void;
    getRequiredConfigKeys(): string[];
}

// Provider configuration interface
export interface ProviderConfig {
    name: string;
    baseUrl?: string;
    apiKey?: string;
    timeout?: number;
    maxRetries?: number;
    [key: string]: any;
}

// Provider error types
export class ProviderError extends Error {
    constructor(
        message: string,
        public provider: string,
        public code?: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'ProviderError';
    }
}

export class ProviderUnavailableError extends ProviderError {
    constructor(provider: string, message: string = 'Provider is not available') {
        super(message, provider, 'PROVIDER_UNAVAILABLE');
        this.name = 'ProviderUnavailableError';
    }
}

export class ProviderTimeoutError extends ProviderError {
    constructor(provider: string, timeout: number) {
        super(`Provider request timed out after ${timeout}ms`, provider, 'PROVIDER_TIMEOUT');
        this.name = 'ProviderTimeoutError';
    }
}

export class ModelNotSupportedError extends ProviderError {
    constructor(provider: string, model: string) {
        super(`Model '${model}' is not supported by provider '${provider}'`, provider, 'MODEL_NOT_SUPPORTED');
        this.name = 'ModelNotSupportedError';
    }
}

export class GenericProvider {
    protected buildPromptWithSchema(prompt: string, schema: JSONSchema): string {
        const schemaString = JSON.stringify(schema, null, 2);

        return `${prompt}

Please respond with valid JSON that matches this exact schema:
${schemaString}

Important: 
- Your response must be valid JSON only, without any additional text, explanations, or markdown formatting. 
- If a property in JSON schema is enum, respect the possible values and only provide value that the schema accepts.
- Don't produce null values for properties listed in provided JSON schema`;
    }
}
