25-07-25_16-13

# Provider Registry Settings-Based Initialization

## Overview
Enhanced the provider registry initialization system to load providers based on available API keys from settings and validate provider availability before registration.

## Implementation Details

### Key Changes
1. **Settings-Based Provider Loading**: Providers are now loaded based on available API keys stored in the database settings
2. **Availability Validation**: Each provider's `isAvailable()` method is called before adding to the registry
3. **Settings Document Requirement**: All providers (including Ollama) require a settings document to exist, even if no API key is needed
4. **Graceful Fallback**: If settings loading fails, the system falls back to basic Ollama initialization

### Provider Initialization Logic

#### For API Key Providers (OpenAI, Anthropic)
- Requires settings document with valid API key
- API key must be non-empty after trimming
- Provider availability is checked via `isAvailable()` method
- Only available providers are added to the registry

#### For Ollama Provider
- Requires settings document to exist (no API key needed)
- Provider availability is checked via `isAvailable()` method
- Added to registry only if available

### Technical Implementation

#### Modified Methods
- `initializeProviders()`: Now async and loads from settings
- `refreshProvidersFromSettings()`: Clears registry and re-initializes from settings
- Constructor: Handles async initialization without blocking

#### Provider Initialization Flow
1. Load LLM API key settings from database
2. Create maps of provider names to API keys and available providers
3. Iterate through provider initializers:
   - Check if settings document exists
   - For API key providers, validate key availability
   - Create provider instance with appropriate configuration
   - Test provider availability via `isAvailable()`
   - Add to registry only if available
4. Fallback to basic Ollama initialization if settings loading fails

#### Error Handling
- Comprehensive logging for debugging provider initialization
- Graceful handling of provider availability check failures
- Fallback initialization for critical scenarios
- Clear error messages for troubleshooting

### Benefits
1. **Dynamic Provider Loading**: Only providers with proper configuration are loaded
2. **Improved Reliability**: Availability checks prevent non-functional providers from being registered
3. **Better Resource Management**: Avoids initializing providers that cannot be used
4. **Enhanced Debugging**: Detailed logging for provider initialization status
5. **Settings Integration**: Full integration with the database-driven settings system

### Usage Impact
- Providers without proper settings configuration will not be available
- System automatically adapts to available provider configurations
- Real-time provider availability reflected in the registry
- Improved error handling for provider-related operations

## Configuration Requirements

### Database Settings
Each provider requires a settings document in the `settings` table:
- **Type**: `llm-api-key`
- **Provider**: Provider name (`openai`, `anthropic`, `ollama`)
- **API Key**: Valid API key (required for OpenAI/Anthropic, empty for Ollama)

### Provider Availability
Providers must pass their `isAvailable()` check:
- **Ollama**: HTTP connection to local Ollama service
- **OpenAI**: Valid API key and service accessibility
- **Anthropic**: Valid API key and service accessibility

## Future Enhancements
- Support for additional provider configuration options
- Provider health monitoring and automatic re-initialization
- Dynamic provider discovery and registration
- Provider-specific initialization parameters
