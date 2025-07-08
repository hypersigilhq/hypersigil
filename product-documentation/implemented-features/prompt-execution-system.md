# Prompt Execution System

## Overview

The Prompt Execution System is a comprehensive asynchronous job processing framework that enables users to execute prompts against various AI providers. The system is designed with extensibility, reliability, and scalability in mind.

## Architecture

### Core Components

1. **Execution Model** (`backend/src/models/execution.ts`)
   - Manages execution records with status tracking
   - Supports pagination, filtering, and statistics
   - Handles execution lifecycle from pending to completion

2. **Provider System** (`backend/src/providers/`)
   - **Base Provider Interface**: Defines contract for all AI providers
   - **Ollama Provider**: First implementation supporting local Ollama service
   - **Provider Registry**: Centralized management of all providers
   - **Error Handling**: Comprehensive error types and handling

3. **Execution Service** (`backend/src/services/execution-service.ts`)
   - Orchestrates execution workflow
   - Manages asynchronous job processing
   - Provides queue management and status tracking

4. **API Layer** (`backend/src/api/execution-*`)
   - RESTful endpoints with full type safety
   - Comprehensive error handling and validation
   - Real-time status monitoring capabilities

5. **Background Worker** (`backend/src/index.ts`)
   - Processes pending executions asynchronously
   - Configurable processing intervals
   - Graceful shutdown handling

## Key Features

### Asynchronous Processing
- Executions are queued immediately and processed in the background
- Non-blocking API responses with immediate execution ID
- Real-time status tracking through API endpoints

### Provider Extensibility
- Plugin-based architecture for adding new AI providers
- Standardized interface for consistent behavior
- Provider health monitoring and availability checking

### Robust Error Handling
- Comprehensive error categorization and reporting
- Automatic retry mechanisms with exponential backoff
- Detailed error messages for debugging

### Status Management
- Four execution states: `pending`, `running`, `completed`, `failed`
- Timestamp tracking for performance monitoring
- Execution cancellation for pending jobs

### Monitoring and Analytics
- Execution statistics by status and provider
- Queue status monitoring
- Provider health dashboards

## API Endpoints

### Execution Management
- `POST /api/v1/executions` - Create new execution
- `GET /api/v1/executions` - List executions with filtering
- `GET /api/v1/executions/:id` - Get specific execution
- `DELETE /api/v1/executions/:id` - Cancel pending execution

### Monitoring
- `GET /api/v1/executions/stats` - Execution statistics
- `GET /api/v1/executions/queue/status` - Queue status
- `GET /api/v1/executions/providers/health` - Provider health

### Provider Information
- `GET /api/v1/executions/providers` - List available providers

## Usage Examples

### Creating an Execution
```bash
curl -X POST http://localhost:3000/api/v1/executions \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "uuid-of-prompt",
    "userInput": "What is the capital of France?",
    "providerModel": "ollama:qwen2.5:6b"
  }'
```

### Checking Execution Status
```bash
curl http://localhost:3000/api/v1/executions/execution-uuid
```

### Monitoring Provider Health
```bash
curl http://localhost:3000/api/v1/executions/providers/health
```

## Provider Configuration

### Ollama Provider
- **Base URL**: `http://localhost:11434` (configurable)
- **Timeout**: 30 seconds (configurable)
- **Model Format**: `ollama:model-name` (e.g., `ollama:qwen2.5:6b`)

### Adding New Providers
1. Implement the `AIProvider` interface
2. Add provider to the registry in `provider-registry.ts`
3. Configure provider-specific settings

## Database Schema

### Executions Table
```sql
CREATE TABLE executions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,  -- JSON containing execution details
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Execution Data Structure
```typescript
{
  prompt_id: string;
  user_input: string;
  provider: string;
  model: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
}
```

## Performance Considerations

### Background Processing
- Configurable worker interval (default: 5 seconds)
- Concurrent execution support
- Memory-efficient queue management

### Scalability
- In-process queue suitable for moderate loads
- Database persistence for reliability
- Ready for Redis-based queue migration

### Error Recovery
- Automatic retry mechanisms
- Graceful degradation on provider failures
- Comprehensive logging for debugging

## Security Features

### Input Validation
- Zod schema validation for all API inputs
- UUID validation for resource identifiers
- Provider:model format validation

### Error Information
- Sanitized error messages in API responses
- Detailed logging for internal debugging
- No sensitive information exposure

## Future Enhancements

### Planned Features
1. **Additional Providers**: OpenAI, Anthropic, Google AI
2. **Streaming Responses**: Real-time execution updates
3. **Result Caching**: Optimize repeated executions
4. **Execution Templates**: Predefined execution configurations
5. **Batch Processing**: Multiple executions in single request
6. **Scheduling**: Time-based execution triggers

### Scalability Improvements
1. **Redis Queue**: For high-throughput scenarios
2. **Horizontal Scaling**: Multi-instance support
3. **Load Balancing**: Provider request distribution
4. **Metrics Collection**: Detailed performance monitoring

## Troubleshooting

### Common Issues
1. **Ollama Connection**: Ensure Ollama service is running on localhost:11434
2. **Model Availability**: Check available models with provider health endpoint
3. **Queue Stalling**: Monitor queue status and restart if needed

### Debugging
- Check server logs for detailed error information
- Use provider health endpoint to verify connectivity
- Monitor execution statistics for performance insights

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode
- `CORS_ORIGIN`: CORS configuration

### Provider Settings
- Ollama base URL and timeout configurable in provider constructor
- Future providers will support similar configuration patterns
