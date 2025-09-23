# Generate Embedding Worker Implementation

## Overview
Implemented an asynchronous worker job for vector embedding generation using the VoyageAI API service. This worker provides background processing capabilities for embedding generation with proper error handling, retry logic, and concurrency control.

## Technical Implementation

### Worker Architecture
- **Location**: `backend/src/workers/workers/generate-embedding.ts`
- **Type**: `generate-embedding`
- **Concurrency**: 5 concurrent jobs (configurable)
- **Priority**: High priority (2) - processed after webhooks but before other jobs
- **Retries**: 3 attempts with exponential backoff

### Worker Data Interface
```typescript
interface GenerateEmbeddingData {
    inputs: string | string[];
    model: 'voyage-3-large' | 'voyage-3.5' | 'voyage-3.5-lite' | 'voyage-code-3' | 'voyage-finance-2' | 'voyage-law-2';
    inputType?: 'query' | 'document' | null;
}
```

### Error Handling Strategy
- **Configuration Errors** (API key not configured): Job terminated immediately
- **Input Validation Errors** (empty input, token limits): Job terminated immediately
- **Network/API Errors**: Scheduled for retry with exponential backoff
- **Unexpected Errors**: Job terminated after max attempts

### Input Validation
- Validates input is not empty
- Enforces 1000 item limit for batch processing
- Estimates token usage and validates against model limits
- Supports both single text and batch text inputs

### Concurrency Configuration
- **Max Concurrency**: 5 simultaneous embedding jobs
- **Priority**: 2 (higher than default, lower than webhooks)
- **Resource Management**: Prevents API rate limiting through controlled parallelism

### Result Format
Returns `VoyageAIEmbeddingsResult` containing:
- `embeddings`: Array of number arrays (vector embeddings)
- `model`: Model used for generation
- `totalTokens`: Token usage count

### Usage Example
```typescript
import { scheduler } from '../workers/scheduler';

// Single text embedding
const jobId1 = await scheduler.send('generate-embedding', {
    inputs: "Hello world",
    model: "voyage-3.5",
    inputType: "document"
});

// Batch text embedding
const jobId2 = await scheduler.send('generate-embedding', {
    inputs: ["Text 1", "Text 2", "Text 3"],
    model: "voyage-3.5-lite"
});

// Check job status and get results
const job = await jobModel.findById(jobId1);
if (job.status === 'completed') {
    const embeddings = job.result; // VoyageAIEmbeddingsResult
}
```

## Integration Points

### Worker Registry
- Registered with `WorkerRegistry.register()` for automatic discovery
- Type-safe integration with worker engine

### Worker Engine Configuration
- Added to `jobTypeConcurrency` with optimized settings
- Integrated with priority-based job scheduling

### Service Dependencies
- Uses `voyageAIApiService` for actual API calls
- Retrieves encrypted API keys from settings database
- Follows existing error handling patterns (`Result<T, E>`)

## Performance Considerations
- **Token Estimation**: Rough word-count based validation (can be improved with actual tokenization)
- **Concurrency Limits**: Prevents API rate limiting through controlled parallelism
- **Retry Logic**: Exponential backoff prevents thundering herd problems
- **Resource Isolation**: Separate worker pool prevents interference with other job types

## Monitoring and Logging
- Comprehensive logging for job lifecycle events
- Error categorization for better debugging
- Performance metrics (embedding count, token usage, processing time)

## Future Enhancements
- **Tokenization Integration**: Replace word-count estimation with actual token counting
- **Caching Layer**: Cache embeddings for repeated inputs
- **Batch Optimization**: Optimize batch processing for better throughput
- **Progress Tracking**: Add progress indicators for large batch jobs
- **Rate Limiting**: Implement intelligent rate limiting based on API quotas

## Testing Requirements
- Unit tests for input validation logic
- Integration tests with mock VoyageAI API responses
- Error handling edge cases (network failures, API limits)
- Concurrency and performance testing
- Token limit validation accuracy testing
