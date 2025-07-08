// Base interface for AI providers
export interface AIProvider {
    name: string;
    execute(prompt: string, userInput: string, model: string): Promise<string>;
    isAvailable(): Promise<boolean>;
    getSupportedModels(): Promise<string[]>;
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
