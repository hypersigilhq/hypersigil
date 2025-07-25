import { AIProvider, AIProviderName } from './base-provider';
import { OllamaProvider } from './ollama-provider';
import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';
import { settingsModel, LlmApiKeySettingsDocument } from '../models/settings';

export class ProviderRegistry {
    private providers: Map<string, AIProvider> = new Map();
    private static instance: ProviderRegistry;

    private constructor() {
        // Initialize providers from settings asynchronously (don't await to avoid blocking constructor)
        this.initializeProviders().catch((error: any) => {
            console.warn('Failed to initialize providers from settings during initialization:', error);
        });
    }

    public static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    }

    private async initializeProviders(): Promise<void> {
        const llmKeys = await settingsModel.getLLMKeys();

        for (const keyDoc of llmKeys) {
            const providerName = keyDoc.provider;
            const apiKey = keyDoc.api_key;

            // Create provider instance
            const result = this.createProviderInstance(providerName, apiKey);

            if (result.err) {
                console.error(`Failed to create provider`, providerName, result.error)
                continue
            }

            // Check availability before adding to registry
            let provider = result.data
            const isAvailable = await provider.isAvailable();
            if (isAvailable) {
                this.providers.set(provider.name, provider);
                console.log(`Successfully initialized ${provider.name} provider`);
            } else {
                console.warn(`Provider ${provider.name} is not available - skipping`);
            }
        }
    }

    public getProvider(name: string): AIProvider | null {
        return this.providers.get(name) || null;
    }

    public getAllProviders(): AIProvider[] {
        return Array.from(this.providers.values());
    }

    public getProviderNames(): string[] {
        return Array.from(this.providers.keys());
    }

    public async getAvailableProviders(): Promise<AIProvider[]> {
        const availableProviders: AIProvider[] = [];

        for (const provider of this.providers.values()) {
            try {
                const isAvailable = await provider.isAvailable();
                if (isAvailable) {
                    availableProviders.push(provider);
                }
            } catch (error) {
                console.warn(`Provider ${provider.name} availability check failed:`, error);
            }
        }

        return availableProviders;
    }

    public async getProviderHealth(): Promise<Record<string, {
        available: boolean;
        models: string[];
        error?: string;
        [key: string]: any;
    }>> {
        const health: Record<string, any> = {};

        for (const [name, provider] of this.providers.entries()) {
            try {
                if ('healthCheck' in provider && typeof provider.healthCheck === 'function') {
                    // Use provider-specific health check if available
                    health[name] = await (provider as any).healthCheck();
                } else {
                    // Fallback to basic availability check
                    const available = await provider.isAvailable();
                    const models = available ? await provider.getSupportedModels() : [];
                    health[name] = {
                        available,
                        models,
                        ...(available ? {} : { error: 'Provider is not available' })
                    };
                }
            } catch (error) {
                health[name] = {
                    available: false,
                    models: [],
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        }

        return health;
    }

    public async getAvailableModels(): Promise<Record<string, string[]>> {
        const models: Record<string, string[]> = {};

        for (const [name, provider] of this.providers.entries()) {
            try {
                const isAvailable = await provider.isAvailable();
                if (isAvailable) {
                    const supportedModels = await provider.getSupportedModels();
                    models[name] = supportedModels;
                }
            } catch (error) {
                console.warn(`Failed to get models for provider ${name}:`, error);
                // Skip providers that fail - don't include them in the response
            }
        }

        return models;
    }

    public parseProviderModel(providerModel: string): { provider: AIProviderName; model: string } {
        const parts = providerModel.split(':');
        if (parts.length < 2) {
            throw new Error(`Invalid provider:model format: ${providerModel}. Expected format: provider:model`);
        }

        const provider = <AIProviderName>parts[0];
        const model = parts.slice(1).join(':'); // Handle models with colons in their names

        if (!provider || !model) {
            throw new Error(`Invalid provider:model format: ${providerModel}. Expected format: provider:model`);
        }

        if (!this.providers.has(provider)) {
            throw new Error(`Unknown provider: ${provider}. Available providers: ${this.getProviderNames().join(', ')}`);
        }

        return { provider, model };
    }

    public async validateProviderModel(providerModel: string): Promise<{ provider: AIProvider; model: string }> {
        const { provider: providerName, model } = this.parseProviderModel(providerModel);

        const provider = this.getProvider(providerName);
        if (!provider) {
            throw new Error(`Provider not found: ${providerName}`);
        }

        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
            throw new Error(`Provider ${providerName} is not available`);
        }

        // Check if model is supported
        const supportedModels = await provider.getSupportedModels();
        if (!supportedModels.includes(model)) {
            throw new Error(`Model ${model} is not supported by provider ${providerName}. Available models: ${supportedModels.join(', ')}`);
        }

        return { provider, model };
    }

    public addProvider(provider: AIProvider): void {
        this.providers.set(provider.name, provider);
    }

    public removeProvider(name: string): boolean {
        return this.providers.delete(name);
    }

    /**
     * Refresh all providers with current API keys from database settings
     */
    public async refreshProvidersFromSettings(): Promise<void> {
        try {
            // Clear existing providers
            this.providers.clear();

            // Re-initialize providers from settings
            await this.initializeProviders();
        } catch (error) {
            console.error('Failed to refresh providers from settings:', error);
            throw error;
        }
    }

    /**
     * Create a provider instance based on provider name and configuration
     */
    private createProviderInstance(providerName: AIProviderName, apiKey: string): Result<AIProvider, string> {
        switch (providerName) {
            case 'openai':
                return Ok(new OpenAIProvider({ apiKey }))
            case 'anthropic':
                return Ok(new AnthropicProvider({ apiKey }))
            case 'ollama':
                return Ok(new OllamaProvider())
            default:
                return Err(`Unknown provider: ${providerName}`);
        }
    }

    /**
     * Initialize a specific provider with settings-based configuration
     */
    public isProviderAvailable(providerName: AIProviderName, apiKey: string): Result<Promise<boolean>, string> {
        const provider = this.createProviderInstance(providerName, apiKey);

        if (provider.err) {
            return Err(provider.error)
        }

        return Ok(provider.data.isAvailable())
    }
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();
