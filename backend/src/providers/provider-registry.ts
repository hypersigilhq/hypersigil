import { AIProvider, AIProviderName } from './base-provider';
import { OllamaProvider } from './ollama-provider';
import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { DeepSeekProvider } from './deepseek-provider';
import { settingsModel, LlmApiKeySettingsDocument } from '../models/settings';
import { decryptString } from '../util/encryption';

interface ProviderStatus {
    name: AIProviderName;
    available: boolean;
    models: string[];
    error?: string;
    lastChecked: number;
    provider: AIProvider;
    supportsFileUpload: boolean;
}

interface ConsolidatedProviderData {
    providers: Map<AIProviderName, ProviderStatus>;
    lastUpdated: number;
    isRefreshing: boolean;
}

export class ProviderRegistry {
    private consolidatedData: ConsolidatedProviderData = {
        providers: new Map(),
        lastUpdated: 0,
        isRefreshing: false
    };
    private readonly cacheTTL = 60 * 60 * 1000; // 5 minutes
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
        const now = Date.now();

        for (const keyDoc of llmKeys) {
            const providerName = keyDoc.provider;
            const apiKey = decryptString(keyDoc.api_key);

            if (apiKey.err) {
                console.error(`Failed to decrypt api key for provider`, providerName)
                continue
            }

            // Create provider instance
            const result = this.createProviderInstance(providerName, apiKey.data);

            if (result.err) {
                console.error(`Failed to create provider`, providerName, result.error)
                continue
            }

            // Check availability and get models
            let provider = result.data
            const isAvailable = await provider.isAvailable();
            let models: string[] = [];
            let error: string | undefined;

            if (isAvailable) {
                try {
                    models = await provider.getSupportedModels();
                    console.log(`Successfully initialized ${provider.name} provider`);
                } catch (modelError) {
                    console.warn(`Failed to get models for provider ${provider.name}:`, modelError);
                    models = [];
                    error = modelError instanceof Error ? modelError.message : String(modelError);
                }
            } else {
                console.warn(`Provider ${provider.name} is not available - skipping`);
                error = 'Provider is not available';
            }

            // Add to consolidated data directly
            const status: ProviderStatus = {
                name: provider.name,
                available: isAvailable,
                models,
                lastChecked: now,
                provider,
                supportsFileUpload: provider.supportsFileUpload()
            };

            if (error) {
                status.error = error;
            }

            this.consolidatedData.providers.set(provider.name, status);
        }

        // Update consolidated data timestamp
        this.consolidatedData.lastUpdated = now;
        this.consolidatedData.isRefreshing = false;
    }

    /**
     * Refresh consolidated provider status data
     */
    private async refreshProviderStatus(): Promise<void> {
        if (this.consolidatedData.isRefreshing) {
            return; // Avoid concurrent refreshes
        }

        this.consolidatedData.isRefreshing = true;
        const now = Date.now();

        try {
            // Get all provider status in parallel using Promise.allSettled
            const providerStatusPromises = Array.from(this.consolidatedData.providers.entries()).map(
                async ([name, existingStatus]): Promise<[AIProviderName, ProviderStatus]> => {
                    const provider = existingStatus.provider;
                    try {
                        const available = await provider.isAvailable();
                        let models: string[] = [];
                        let error: string | undefined;

                        if (available) {
                            try {
                                models = await provider.getSupportedModels();
                            } catch (modelError) {
                                console.warn(`Failed to get models for provider ${name}:`, modelError);
                                models = [];
                                error = modelError instanceof Error ? modelError.message : String(modelError);
                            }
                        } else {
                            error = 'Provider is not available';
                        }

                        const status: ProviderStatus = {
                            name,
                            available,
                            models,
                            lastChecked: now,
                            provider,
                            supportsFileUpload: provider.supportsFileUpload()
                        };

                        if (error) {
                            status.error = error;
                        }

                        return [name, status];
                    } catch (error) {
                        return [name, {
                            name,
                            available: false,
                            models: [],
                            error: error instanceof Error ? error.message : String(error),
                            lastChecked: now,
                            provider,
                            supportsFileUpload: false
                        }];
                    }
                }
            );

            const results = await Promise.allSettled(providerStatusPromises);
            const newProviderMap = new Map<AIProviderName, ProviderStatus>();

            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    const [name, status] = result.value;
                    newProviderMap.set(name, status);
                } else {
                    console.error('Failed to get provider status:', result.reason);
                }
            });

            // Update consolidated data
            this.consolidatedData = {
                providers: newProviderMap,
                lastUpdated: now,
                isRefreshing: false
            };

            console.log(`Refreshed status for ${newProviderMap.size} providers`);
        } catch (error) {
            console.error('Error refreshing provider status:', error);
            this.consolidatedData.isRefreshing = false;
        }
    }

    /**
     * Ensure consolidated data is fresh, refresh if needed
     */
    private async ensureFreshConsolidatedData(): Promise<void> {
        const now = Date.now();
        const isExpired = (now - this.consolidatedData.lastUpdated) > this.cacheTTL;
        const isEmpty = this.consolidatedData.providers.size === 0;

        if (isExpired || isEmpty) {
            await this.refreshProviderStatus();
        }
    }

    /**
     * Invalidate consolidated cache
     */
    private invalidateConsolidatedCache(): void {
        this.consolidatedData.lastUpdated = 0;
    }

    public getProvider(name: AIProviderName): AIProvider | null {
        const status = this.consolidatedData.providers.get(name);
        return status ? status.provider : null;
    }

    public getAllProviders(): AIProvider[] {
        return Array.from(this.consolidatedData.providers.values()).map(status => status.provider);
    }

    public getProviderNames(): string[] {
        return Array.from(this.consolidatedData.providers.keys());
    }

    public async getAvailableProviders(): Promise<AIProvider[]> {
        await this.ensureFreshConsolidatedData();

        const availableProviders: AIProvider[] = [];
        for (const status of this.consolidatedData.providers.values()) {
            if (status.available) {
                availableProviders.push(status.provider);
            }
        }

        return availableProviders;
    }

    public async getProviderHealth(): Promise<Record<string, {
        available: boolean;
        models: string[];
        error?: string;
        supportsFileUpload: boolean;
        [key: string]: any;
    }>> {
        await this.ensureFreshConsolidatedData();

        const health: Record<string, any> = {};
        for (const [name, status] of this.consolidatedData.providers.entries()) {
            health[name] = {
                available: status.available,
                models: status.models,
                supportsFileUpload: status.supportsFileUpload,
                ...(status.error && { error: status.error })
            };
        }

        return health;
    }

    public async getAvailableModels(supportsFileUpload: boolean): Promise<Record<string, string[]>> {
        await this.ensureFreshConsolidatedData();

        const models: Record<string, string[]> = {};
        for (const [name, status] of this.consolidatedData.providers.entries()) {
            if (status.available) {

                if (supportsFileUpload && !status.supportsFileUpload) {
                    continue
                }

                models[name] = status.models;
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

        if (!this.consolidatedData.providers.has(provider)) {
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
        const now = Date.now();
        const status: ProviderStatus = {
            name: provider.name,
            available: false, // Will be updated on next refresh
            models: [],
            lastChecked: 0,
            provider,
            supportsFileUpload: false
        };
        this.consolidatedData.providers.set(provider.name, status);
        this.invalidateConsolidatedCache();
    }

    public removeProvider(name: AIProviderName): boolean {
        const removed = this.consolidatedData.providers.delete(name);
        if (removed) {
            this.invalidateConsolidatedCache();
        }
        return removed;
    }

    /**
     * Refresh all providers with current API keys from database settings
     */
    public async refreshProvidersFromSettings(): Promise<void> {
        try {
            // Clear existing providers and cache
            this.consolidatedData.providers.clear();
            this.invalidateConsolidatedCache();

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
            case 'gemini':
                return Ok(new GeminiProvider({ apiKey }))
            case 'deepseek':
                return Ok(new DeepSeekProvider({ apiKey }))
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
