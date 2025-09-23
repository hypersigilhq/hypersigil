# VoyageAI Embeddings API Service Implementation

## Overview
Implemented a VoyageAI API service for vector embedding generation in the backend services layer. This service enables the application to generate high-quality text embeddings using VoyageAI's embedding models.

## Technical Implementation

### Service Architecture
- **Location**: `backend/src/services/voyageai-api.ts`
- **Pattern**: Singleton service class following existing codebase patterns
- **Error Handling**: Uses `Result<T, E>` pattern with `Ok()` and `Err()` functions
- **API Key Management**: Retrieves encrypted API keys from settings database

### Key Features

#### API Integration
- **Endpoint**: `POST https://api.voyageai.com/v1/embeddings`
- **Authentication**: Bearer token authentication using stored API keys
- **Supported Models**:
  - `voyage-3-large` (1024 dimensions)
  - `voyage-3.5` (1024 dimensions)
  - `voyage-3.5-lite` (512 dimensions)
  - `voyage-code-3` (2048 dimensions)
  - `voyage-finance-2` (1024 dimensions)
  - `voyage-law-2` (1024 dimensions)

#### Input Validation
- Supports single text strings or arrays of strings (max 1000 items)
- Token limit validation based on model specifications
- Input type specification (`query`, `document`, or `null`)

#### Error Handling
- API key configuration validation
- Network error handling
- API response error parsing
- Token limit enforcement
- Timeout handling

### API Key Management
- Retrieves active VoyageAI API keys from settings
- Automatic decryption of stored keys
- Supports multiple keys with active/inactive status

### Usage Example
```typescript
import { voyageAIApiService } from '../services';

const result = await voyageAIApiService.generateEmbeddings({
    input: ["Hello world", "How are you?"],
    model: "voyage-3.5",
    input_type: "document"
});

if (result.success) {
    console.log("Embeddings:", result.data.embeddings);
    console.log("Model:", result.data.model);
    console.log("Tokens used:", result.data.totalTokens);
} else {
    console.error("Error:", result.error);
}
```

## Database Changes
- Added `getServiceApiKeys()` method to `SettingsModel` class
- No schema changes required (uses existing service API key structure)

## Security Considerations
- API keys are stored encrypted in the database
- Keys are decrypted only when needed for API calls
- No logging of API keys or request/response bodies

## Performance Considerations
- Token limit validation prevents unnecessary API calls
- Rough token estimation (word count) for input validation
- Proper error handling prevents resource leaks

## Future Enhancements
- Actual tokenization for more accurate token counting
- Caching of embeddings for repeated inputs
- Batch processing optimizations
- Streaming support for large embedding requests

## Testing Requirements
- Unit tests for input validation
- Integration tests with mock API responses
- Error handling edge cases
- Token limit validation accuracy
