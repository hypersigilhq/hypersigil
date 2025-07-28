25-07-22_13-36

# Prompt Preview Endpoint

## Overview
Added a new API endpoint that allows previewing compiled prompts using Mustache templating. This endpoint enables users to see how their prompts will look when compiled with specific user input data before executing them.

## API Endpoint
- **Method**: POST
- **Path**: `/api/v1/prompts/preview`
- **Authentication**: Required

## Request Schema
The endpoint accepts either:
1. A prompt ID (with optional version) + user input data
2. Raw prompt text + user input data

```typescript
{
  // Option 1: Use existing prompt from database
  promptId?: string (UUID),
  version?: number,
  
  // Option 2: Use raw prompt text
  promptText?: string,
  
  // Required: JSON string containing data for compilation
  userInput: string
}
```

### Validation Rules
- Either `promptId` or `promptText` must be provided, but not both
- `userInput` must be a valid JSON string
- If `promptId` is provided, the prompt must exist in the database
- If `version` is specified with `promptId`, that version must exist

## Response Schema
```typescript
{
  compiledPrompt: string,    // The final compiled prompt with variables replaced
  originalPrompt: string,    // The original prompt template
  userInput: object         // The parsed JSON input data
}
```

## Implementation Details

### Backend Components
1. **API Definition** (`backend/src/api/definitions/prompt.ts`):
   - Added `PreviewPromptRequestSchema` with validation logic
   - Added `PreviewPromptResponseSchema` for type-safe responses
   - Added endpoint definition in `PromptApiDefinition`

2. **Handler Implementation** (`backend/src/api/handlers/prompt.ts`):
   - Validates input JSON format
   - Handles both prompt ID and raw text scenarios
   - Supports version-specific prompt compilation
   - Uses existing `compilePrompt` method from prompt model
   - Comprehensive error handling for various failure scenarios

### Key Features
- **Flexible Input**: Supports both database prompts and ad-hoc prompt text
- **Version Support**: Can preview specific versions of stored prompts
- **JSON Validation**: Validates user input as proper JSON before compilation
- **Error Handling**: Comprehensive error responses for validation, compilation, and system errors
- **Type Safety**: Full TypeScript type safety using ts-typed-api

### Error Handling
- **400 Bad Request**: Invalid JSON in userInput, compilation errors, validation errors
- **404 Not Found**: Prompt not found, version not found
- **500 Internal Server Error**: System errors during processing

## Usage Examples

### Preview with Prompt ID
```javascript
POST /api/v1/prompts/preview
{
  "promptId": "123e4567-e89b-12d3-a456-426614174000",
  "userInput": "{\"name\": \"John\", \"age\": 30}"
}
```

### Preview with Specific Version
```javascript
POST /api/v1/prompts/preview
{
  "promptId": "123e4567-e89b-12d3-a456-426614174000",
  "version": 2,
  "userInput": "{\"name\": \"John\", \"age\": 30}"
}
```

### Preview with Raw Prompt Text
```javascript
POST /api/v1/prompts/preview
{
  "promptText": "Hello {{name}}, you are {{age}} years old.",
  "userInput": "{\"name\": \"John\", \"age\": 30}"
}
```

## Integration with Existing System
- Uses the existing `compilePrompt` method from `PromptModel`
- Leverages Mustache templating engine for variable substitution
- Follows established error handling patterns
- Maintains consistency with other prompt-related endpoints
- Supports the existing prompt versioning system

## Benefits
- **Development Efficiency**: Allows testing prompt compilation without creating executions
- **Debugging**: Helps identify template syntax issues before execution
- **User Experience**: Provides immediate feedback on prompt compilation
- **Version Testing**: Enables comparison of different prompt versions
- **Flexibility**: Supports both stored and ad-hoc prompt testing
