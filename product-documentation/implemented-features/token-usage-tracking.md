# Token Usage Tracking Implementation

## Overview
Enhanced the AI provider system to track and return token usage information for all executions, providing visibility into input and output token consumption across different AI providers.

## Changes Made

### 1. Base Provider Interface Updates
- **File**: `backend/src/providers/base-provider.ts`
- **Changes**:
  - Added `ExecutionResult` interface with `output`, `inputTokensUsed`, and `outputTokensUsed` fields
  - Updated `AIProvider.execute()` method to return `Promise<ExecutionResult>` instead of `Promise<string>`

### 2. Provider Implementation Updates
Updated all AI provider implementations to return structured execution results:

#### Claude Provider (`backend/src/providers/claude-provider.ts`)
- Returns token usage from Claude API response (`usage.input_tokens`, `usage.output_tokens`)
- Maintains existing functionality while providing token metrics

#### OpenAI Provider (`backend/src/providers/openai-provider.ts`)
- Returns token usage from OpenAI API response (`usage.prompt_tokens`, `usage.completion_tokens`)
- Supports both GPT and other OpenAI models

#### Ollama Provider (`backend/src/providers/ollama-provider.ts`)
- Returns token usage from Ollama API response (`prompt_eval_count`, `eval_count`)
- Handles cases where token counts may not be available (defaults to 0)

### 3. Data Model Updates
- **File**: `backend/src/models/execution.ts`
- **Changes**:
  - Added `input_tokens_used?: number` and `output_tokens_used?: number` fields to `Execution` interface
  - Updated `updateStatus()` method signature to accept token usage fields
  - Maintains backward compatibility with existing executions

### 4. Service Layer Updates
- **File**: `backend/src/services/execution-service.ts`
- **Changes**:
  - Updated to handle `ExecutionResult` objects from providers
  - Stores token usage information in database alongside execution results
  - Separates output text from token metrics for proper storage

### 5. API Definition Updates
- **File**: `backend/src/api/definitions/execution.ts`
- **Changes**:
  - Added `input_tokens_used` and `output_tokens_used` fields to `ExecutionResponseSchema`
  - Ensures API responses include token usage information
  - Maintains type safety across the API layer

## Benefits

### Cost Tracking
- Enables accurate cost calculation for AI API usage
- Provides visibility into token consumption patterns
- Supports budget planning and optimization

### Performance Monitoring
- Tracks input/output token ratios
- Identifies expensive operations
- Enables optimization of prompt engineering

### Provider Comparison
- Compare token efficiency across different AI providers
- Make informed decisions about provider selection
- Optimize cost vs. performance trade-offs

## Usage Examples

### Execution Response with Token Usage
```json
{
  "id": "execution-123",
  "prompt_id": "prompt-456",
  "status": "completed",
  "result": "AI generated response text",
  "input_tokens_used": 150,
  "output_tokens_used": 75,
  "provider": "openai",
  "model": "gpt-4",
  "created_at": "2025-01-07T20:26:00Z"
}
```

### Provider-Specific Token Handling
- **Claude**: Uses `input_tokens` and `output_tokens` from API response
- **OpenAI**: Uses `prompt_tokens` and `completion_tokens` from API response  
- **Ollama**: Uses `prompt_eval_count` and `eval_count` from API response

## Implementation Notes

### Backward Compatibility
- Existing executions without token data remain functional
- New fields are optional in the database schema
- API responses gracefully handle missing token information

### Error Handling
- Token usage defaults to 0 if not provided by the AI provider
- Execution continues normally even if token counting fails
- No impact on core execution functionality

### Database Storage
- Token usage stored as separate fields in execution records
- Enables efficient querying and aggregation
- Supports future analytics and reporting features

## Future Enhancements

### Analytics Dashboard
- Token usage trends over time
- Cost analysis by provider and model
- Usage optimization recommendations

### Budget Controls
- Token usage limits and alerts
- Cost-based execution throttling
- Provider selection based on budget constraints

### Reporting Features
- Token usage reports by project/user
- Cost allocation and billing integration
- Performance vs. cost analysis

## Technical Considerations

### Type Safety
- Full TypeScript support for token usage fields
- Compile-time validation of provider implementations
- API schema validation ensures data consistency

### Performance Impact
- Minimal overhead for token tracking
- No impact on execution speed
- Efficient database storage of token metrics

### Scalability
- Token data stored efficiently in JSON fields
- Supports high-volume execution tracking
- Ready for future analytics requirements
