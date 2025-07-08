import { AIProvider } from './base-provider';
import { OllamaProvider } from './ollama-provider';

export class ProviderRegistry {
    private providers: Map<string, AIProvider> = new Map();
    private static instance: ProviderRegistry;

    private constructor() {
        this.initializeProviders();
    }

    public static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    }

    private initializeProviders(): void {
        // Initialize Ollama provider
        const ollamaProvider = new OllamaProvider();
        this.providers.set(ollamaProvider.name, ollamaProvider);

        // Future providers can be added here
        // const openaiProvider = new OpenAIProvider();
        // this.providers.set(openaiProvider.name, openaiProvider);
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

    public parseProviderModel(providerModel: string): { provider: string; model: string } {
        const parts = providerModel.split(':');
        if (parts.length < 2) {
            throw new Error(`Invalid provider:model format: ${providerModel}. Expected format: provider:model`);
        }

        const provider = parts[0];
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
}

// Export singleton instance
export const providerRegistry = ProviderRegistry.getInstance();
