25-07-09_00-09

# Execution Options API Feature

## Overview

The execution options feature allows users to specify AI model parameters (temperature, top-k, top-p, etc.) when creating executions and view these parameters in all execution API responses.

## Implementation Details

### Supported Options

The system supports the following execution options:

- **temperature** (0-2): Controls randomness in the AI model's responses
- **maxTokens** (min 1): Maximum number of tokens to generate
- **topP** (0-1): Nucleus sampling parameter
- **topK** (min 1): Top-k sampling parameter
- **schema**: JSON schema for structured responses
- **Additional properties**: Extensible for provider-specific options

### API Integration

#### Request Format
When creating executions via `POST /api/v1/executions`, users can include an optional `options` object:

```json
{
  "promptId": "uuid",
  "userInput": "string",
  "providerModel": "provider:model",
  "options": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "topP": 0.9,
    "topK": 40
  }
}
```

#### Response Format
All execution API endpoints now include the `options` field in their responses:

```json
{
  "id": "uuid",
  "prompt_id": "uuid",
  "user_input": "string",
  "provider": "string",
  "model": "string",
  "status": "pending|running|completed|failed",
  "result": "string",
  "error_message": "string",
  "started_at": "ISO string",
  "completed_at": "ISO string",
  "created_at": "ISO string",
  "updated_at": "ISO string",
  "options": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "topP": 0.9,
    "topK": 40
  }
}
```

### Affected Endpoints

The following API endpoints now include execution options in their responses:

1. **POST /api/v1/executions** - Create execution (accepts and returns options)
2. **GET /api/v1/executions** - List executions (returns options for each execution)
3. **GET /api/v1/executions/:id** - Get specific execution (returns options)

### Data Flow

1. **Input**: Options are validated using Zod schema in the API definition
2. **Storage**: Options are stored in the execution record in the database
3. **Processing**: Options are passed to AI providers during execution
4. **Output**: Options are included in all API responses for transparency

### Benefits

- **Transparency**: Users can see exactly what parameters were used for each execution
- **Debugging**: Easier troubleshooting by viewing execution parameters
- **Consistency**: Options are preserved throughout the execution lifecycle
- **Extensibility**: Support for future provider-specific options

### Technical Implementation

- **Model**: `Execution` interface includes optional `options` field
- **Validation**: Zod schema validates option types and ranges
- **API Handlers**: All execution response mappings include options field
- **Service Layer**: Options are properly passed through the execution service
- **Provider Integration**: Options are merged with prompt schema and passed to providers

This feature enhances the execution system by providing full visibility into the AI model parameters used for each execution, supporting better debugging and result analysis.
