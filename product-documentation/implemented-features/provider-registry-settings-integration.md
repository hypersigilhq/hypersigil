# Provider Registry Settings Integration

## Overview
Integrated the provider registry with the settings model to enable dynamic API key management through the database instead of environment variables. This allows for runtime configuration updates and better control over which providers are available.

## Key Features

### 1. Settings-Based Configuration
- Providers now get their API keys from the database via `settingsModel.getLLMKeys()`
- Removed dependency on environment variables for API keys
- Only providers with valid API keys configured in settings are considered available

### 2. Dynamic Refresh Capability
- Added `refreshProvidersFromSettings()` method to update provider configurations at runtime
- API key changes in settings take effect immediately without server restart
- Automatic refresh during provider registry initialization

### 3. Enhanced Provider Interface
- Added `updateConfig()` method to all providers for runtime configuration updates
- Added `getRequiredConfigKeys()` method to identify provider requirements
- Providers clear their model caches when configuration changes

### 4. Smart Availability Logic
- Providers without required API keys return `false` for `isAvailable()`
- Only properly configured providers appear in available providers list
- Better error handling for missing configurations

## Implementation Details

### Base Provider Interface Updates
```typescript
interface AIProvider {
    // ... existing methods
    updateConfig(config: Partial<ProviderConfig>): void;
    getRequiredConfigKeys(): string[];
}
```

### Provider Registry Methods
- `refreshProvidersFromSettings()`: Refresh all providers with current database settings
- `getProviderConfigFromSettings()`: Get configuration for specific provider
- `initializeProviderWithSettings()`: Initialize provider with settings-based config

### Provider-Specific Changes
- **OpenAI Provider**: Requires `apiKey`, supports organization configuration
- **Anthropic Provider**: Requires `apiKey`, supports version configuration  
- **Ollama Provider**: No API key required, works with local installation

## Usage Examples

### Refresh Providers After Settings Change
```typescript
// After updating API keys in settings
await providerRegistry.refreshProvidersFromSettings();

// Check which providers are now available
const availableProviders = await providerRegistry.getAvailableProviders();
```

### Check Provider Configuration Requirements
```typescript
const provider = providerRegistry.getProvider('openai');
const requiredKeys = provider?.getRequiredConfigKeys(); // ['apiKey']
```

## Benefits

1. **Dynamic Configuration**: API keys can be updated without server restart
2. **Database-Driven**: Single source of truth for provider configurations
3. **Selective Enablement**: Only providers with valid API keys are available
4. **Runtime Refresh**: Settings changes take effect immediately
5. **Better Error Handling**: Clear feedback when providers are misconfigured
6. **Security**: No need to store API keys in environment variables

## Migration Notes

- Environment variables are no longer used as fallbacks for API keys
- Providers initialize with empty API keys by default
- Settings-based configuration is loaded asynchronously during startup
- Existing API endpoints continue to work unchanged

## Future Enhancements

- Add provider-specific configuration options (temperature defaults, timeout settings)
- Implement provider health monitoring with automatic retry logic
- Add support for multiple API keys per provider for load balancing
- Create UI for real-time provider status monitoring
