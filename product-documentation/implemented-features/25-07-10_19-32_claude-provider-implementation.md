25-07-10_19-32

# Claude Provider Implementation

## Overview
Implemented a Claude AI provider for the prompt execution system, following the same architecture pattern as the existing Ollama provider. The Claude provider integrates with Anthropic's Claude API to enable prompt execution using Claude models.

## Implementation Details

### Provider Architecture
- **File**: `backend/src/providers/claude-provider.ts`
- **Interface**: Implements the `AIProvider` interface from `base-provider.ts`
- **Registry Integration**: Automatically registered in `ProviderRegistry` alongside Ollama provider

### Configuration
```typescript
interface ClaudeConfig extends ProviderConfig {
    apiKey: string;        // From ANTHROPIC_API_KEY environment variable
    baseUrl: string;       // Default: https://api.anthropic.com
    timeout: number;       // Default: 240,000ms (4 minutes)
    version: string;       // API version: 2023-06-01
}
```

### Key Features

#### Dynamic Model Discovery
- Uses Anthropic's `/v1/models` endpoint to fetch available models dynamically
- Implements model caching with 5-minute TTL to reduce API calls
- Supports all current Claude models (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku)

#### API Integration
- **Authentication**: Uses `x-api-key` header with API key from environment
- **API Version**: Specifies `anthropic-version: 2023-06-01` header
- **Request Format**: Uses Claude's Messages API with system/user message structure
- **Response Handling**: Extracts text content from Claude's structured response format

#### Structured Output Support
- Implements structured output through prompt engineering
- Adds JSON schema instructions to system prompt when schema is provided
- Instructs Claude to respond with valid JSON matching the specified schema

#### Error Handling
- Maps Anthropic API errors to standardized provider error types
- Handles authentication errors, rate limiting, and model availability
- Implements proper timeout and connection error handling
- Provides detailed error messages with API response context

### API Request Structure
```typescript
{
  model: string,
  max_tokens: number,
  messages: [{ role: "user", content: string }],
  system: string,           // System prompt with context
  temperature: number,      // Default: 0.7
  top_p: number            // Default: 0.9
}
```

### Provider Methods

#### `execute(prompt, userInput, model, options)`
- Validates model availability against fetched models list
- Constructs system prompt with schema instructions if provided
- Makes API request to Claude Messages endpoint
- Extracts and returns text response from Claude's response format

#### `isAvailable()`
- Checks if API key is configured
- Tests connectivity to Claude's `/v1/models` endpoint
- Returns boolean indicating provider availability

#### `getSupportedModels()`
- Fetches available models from `/v1/models` endpoint
- Implements caching to reduce API calls
- Returns array of model IDs

#### `supportsStructuredOutput()`
- Returns `true` - Claude supports structured output via prompt engineering

### Environment Configuration
- **Required**: `ANTHROPIC_API_KEY` environment variable
- **Optional**: Custom base URL and timeout can be provided via constructor

### Integration Points
- Automatically registered in `ProviderRegistry` during initialization
- Compatible with existing execution service and API endpoints
- Supports all execution options (temperature, maxTokens, topP, etc.)
- Works with existing provider:model format (e.g., `claude:claude-3-5-sonnet-20241022`)

### Error Types Handled
- `ProviderUnavailableError`: API key not configured or service unreachable
- `ModelNotSupportedError`: Requested model not available
- `ProviderTimeoutError`: Request timeout exceeded
- `ProviderError`: General API errors with detailed messages

## Usage
Once the `ANTHROPIC_API_KEY` environment variable is set, the Claude provider becomes available for prompt execution through the existing API endpoints. Users can select Claude models in the execution interface using the format `claude:model-name`.

## Technical Benefits
- **Consistent Architecture**: Follows the same patterns as existing providers
- **Type Safety**: Full TypeScript implementation with proper interfaces
- **Error Resilience**: Comprehensive error handling and recovery
- **Performance**: Model caching reduces unnecessary API calls
- **Extensibility**: Easy to extend for future Claude API features
