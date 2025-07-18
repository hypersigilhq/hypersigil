# Prompt Compilation with Mustache

## Overview
Implemented a prompt compilation system that allows compiling prompt templates with test data using the Mustache templating engine. This feature enables dynamic prompt generation by substituting variables in prompt templates with actual test data.

## Implementation Details

### Dependencies Added
- `mustache`: Template engine for compiling prompts with data
- `@types/mustache`: TypeScript type definitions for mustache

### Backend Model Method
Added `compilePrompt` method to `PromptModel` class in `backend/src/models/prompt.ts`:

```typescript
public compilePrompt(
    testDataItem: TestDataItem, 
    promptVersion: PromptVersion
): { success: true; compiledPrompt: string } | { success: false; error: string }
```

#### Functionality
1. **JSON Validation**: Parses the test data item content and validates it as valid JSON
2. **Template Compilation**: Uses Mustache to render the prompt template with the parsed test data
3. **Error Handling**: Returns structured error responses for invalid JSON or compilation failures

### API Definition
Added new schemas and endpoint to `backend/src/api/definitions/test-data.ts`:

#### Request Schema
```typescript
export const CompilePromptRequestSchema = z.object({
    promptId: z.string().uuid(),
    testDataItemId: z.string().uuid(),
    promptVersion: z.number().optional()
});
```

#### Response Schema
```typescript
export const CompilePromptResponseSchema = z.object({
    success: z.boolean(),
    compiledPrompt: z.string().optional(),
    error: z.string().optional()
});
```

#### Endpoint
- **Method**: POST
- **Path**: `/api/v1/test-data/compile-prompt`
- **Body**: CompilePromptRequest
- **Responses**: 200 (success), 400 (validation error), 404 (not found), 500 (server error)

### API Handler
Implemented handler in `backend/src/api/handlers/test-data.ts`:

#### Process Flow
1. Validates that both prompt and test data item exist
2. Retrieves the specified prompt version (or uses current version if not specified)
3. Calls the model's `compilePrompt` method
4. Returns the compilation result or error

#### Error Handling
- **404**: Prompt not found
- **404**: Test data item not found
- **404**: Prompt version not found
- **400**: Invalid JSON in test data item content
- **500**: Internal server errors

## Usage Example

### Request
```json
POST /api/v1/test-data/compile-prompt
{
    "promptId": "123e4567-e89b-12d3-a456-426614174000",
    "testDataItemId": "987fcdeb-51a2-43d1-b123-456789abcdef",
    "promptVersion": 2
}
```

### Success Response
```json
{
    "success": true,
    "compiledPrompt": "Hello John, you are 25 years old and work as a Developer."
}
```

### Error Response
```json
{
    "success": false,
    "error": "Invalid JSON in test data item content: Unexpected token 'a' at position 1"
}
```

## Technical Benefits
1. **Type Safety**: Full TypeScript support with proper type definitions
2. **Validation**: Automatic JSON validation for test data content
3. **Version Support**: Can compile against specific prompt versions
4. **Error Handling**: Comprehensive error reporting for debugging
5. **Template Engine**: Uses industry-standard Mustache templating for reliable compilation

## Integration Points
- Works with existing prompt versioning system
- Integrates with test data management system
- Can be used as foundation for batch execution features
- Supports the execution workflow by providing compiled prompts
