# Prompt Adjustment Service

## Overview

The Prompt Adjustment Service is a backend service that generates adjustment prompts based on user comments and execution results. This service helps users refine their prompts by providing structured feedback that includes the original prompt, execution results, and associated comments.

## Architecture

### Service Layer
- **Location**: `backend/src/services/prompt-adjustment-service.ts`
- **Pattern**: Singleton service following existing architecture patterns
- **Dependencies**: CommentModel, ExecutionModel, PromptModel

### API Integration
- **Endpoint**: `POST /api/v1/prompts/:id/generate-adjustment`
- **Handler**: Added to `backend/src/api/handlers/prompt.ts`
- **Definitions**: Extended `backend/src/api/definitions/prompt.ts`

## Core Functionality

### Input Parameters
- `commentIds`: Array of comment UUIDs to include in the adjustment
- `promptId`: UUID of the prompt to generate adjustment for (via URL parameter)

### Validation Rules
1. **Prompt Validation**: Prompt must exist and be accessible
2. **Comment Validation**: All comments must exist and belong to the specified prompt
3. **Execution Validation**: All referenced executions must have completed successfully with results
4. **Input Validation**: At least one comment ID must be provided

### Output Format
The service generates a structured adjustment prompt with the following sections:

```
Original Prompt:
[Current version of the prompt]

Execution Results & Comments:

Execution ID: [execution_id_1]
Result: [execution result]
Comments:
- Comment: "[comment text]" | Selected Text: "[selected_text]"
- Comment: "[comment text]" | Selected Text: "[selected_text]"

Execution ID: [execution_id_2]
Result: [execution result]
Comments:
- Comment: "[comment text]" | Selected Text: "[selected_text]"

Generic Comments (not tied to specific executions):
- Comment: "[comment text]"

Please provide an adjusted version of the original prompt that addresses the feedback provided in the comments.
```

## API Specification

### Request
```typescript
POST /api/v1/prompts/:id/generate-adjustment
Content-Type: application/json

{
  "commentIds": ["uuid1", "uuid2", "uuid3"]
}
```

### Response (Success)
```typescript
HTTP 200 OK
Content-Type: application/json

{
  "adjustmentPrompt": "string",
  "originalPrompt": "string", 
  "commentsProcessed": number
}
```

### Error Responses
- **400 Bad Request**: Invalid input, missing comment IDs, or validation failures
- **404 Not Found**: Prompt, comment, or execution not found
- **500 Internal Server Error**: Unexpected server errors

## Implementation Details

### Service Methods

#### `generateAdjustmentPrompt(commentIds: string[], promptId: string)`
Main service method that orchestrates the adjustment prompt generation:
1. Validates prompt existence and retrieves current version
2. Fetches and validates all comments belong to the prompt
3. Groups comments by execution_id (separates generic comments)
4. Fetches and validates all referenced executions are completed successfully
5. Builds the formatted adjustment prompt

#### `fetchAndValidateComments(commentIds: string[], promptId: string)`
Private method that:
- Fetches each comment by ID
- Validates comment exists
- Validates comment belongs to the specified prompt

#### `groupCommentsByExecution(comments: Comment[])`
Private method that separates comments into:
- Execution-specific comments (grouped by execution_id)
- Generic comments (not tied to executions)

#### `fetchAndValidateExecutions(executionIds: string[])`
Private method that:
- Fetches each execution by ID
- Validates execution exists
- Validates execution status is 'completed'
- Validates execution has a result

#### `buildAdjustmentPrompt(...)`
Private method that formats the final adjustment prompt string with proper sections and formatting.

## Error Handling

### Validation Errors (400)
- Empty comment IDs array
- Comments that don't belong to the specified prompt
- Executions that haven't completed successfully
- Executions without results

### Not Found Errors (404)
- Prompt not found
- Comment not found
- Execution not found
- Prompt version not found

### Server Errors (500)
- Database connection issues
- Unexpected service failures

## Integration Points

### Comment System
- Leverages existing comment model and API
- Supports both execution comments (with selected_text) and generic comments
- Maintains comment-to-prompt and comment-to-execution relationships

### Execution System
- Integrates with execution results
- Validates execution completion status
- Accesses execution result data

### Prompt Versioning
- Uses current version of the prompt for adjustment generation
- Maintains compatibility with prompt versioning system

## Usage Scenarios

1. **Execution Result Refinement**: Users can select comments on specific execution results to generate targeted prompt improvements
2. **Batch Feedback Processing**: Multiple comments across different executions can be processed together
3. **Generic Feedback Integration**: Non-execution-specific comments are included for comprehensive prompt adjustment

## Future Enhancements

- Template customization for different adjustment prompt formats
- Support for filtering comments by type or date range
- Integration with AI providers for automated prompt suggestions
- Caching of frequently generated adjustments
- Batch processing for multiple prompts
