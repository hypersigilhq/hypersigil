25-07-28_12-42

# Prompt Options Property Implementation

## Overview
Added an `options` property to the prompt model, API definitions, and handlers to support prompt configuration settings. This enhancement allows prompts to have configurable options that control their behavior and capabilities.

## Technical Implementation

### Model Changes
- **File**: `backend/src/models/prompt.ts`
- Added `options` property to both `Prompt` and `PromptVersion` interfaces
- Structure: `{ acceptFileUpload?: boolean | undefined } | undefined`
- Integrated options into versioning system - options changes trigger new version creation
- Options are preserved and tracked across all prompt versions

### API Definition Updates
- **File**: `backend/src/api/definitions/prompt.ts`
- Created `PromptOptionsSchema` with Zod validation
- Added `options` property to:
  - `PromptVersionSchema` - for version-specific options
  - `PromptResponseSchema` - for API responses
  - `CreatePromptRequestSchema` - for prompt creation
  - `UpdatePromptRequestSchema` - for prompt updates
- Exported `PromptOptions` type for type safety

### Handler Integration
- **File**: `backend/src/api/handlers/prompt.ts`
- Updated `formatPromptForResponse()` function to include options in responses
- Options are automatically handled in create/update operations through existing model methods
- Full type safety maintained throughout the request/response cycle

## Schema Structure

```typescript
export const PromptOptionsSchema = z.object({
    acceptFileUpload: z.boolean().optional()
}).optional();

export type PromptOptions = z.infer<typeof PromptOptionsSchema>;
```

## Current Options

### acceptFileUpload
- **Type**: `boolean | undefined`
- **Purpose**: Controls whether the prompt accepts file uploads during execution
- **Default**: `undefined` (inherits system default behavior)
- **Usage**: When set to `true`, enables file upload capabilities for this specific prompt

## API Integration

### Request/Response Format
```json
{
  "id": "uuid",
  "name": "Example Prompt",
  "prompt": "Analyze this content...",
  "options": {
    "acceptFileUpload": true
  },
  "versions": [
    {
      "version": 1,
      "name": "Example Prompt",
      "prompt": "Analyze this content...",
      "options": {
        "acceptFileUpload": true
      },
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Versioning Behavior
- Options changes trigger automatic version creation
- Each version maintains its own options configuration
- Options are compared during updates to determine if versioning is needed
- Historical options are preserved in version history

## Benefits

1. **Extensibility**: Easy to add new prompt configuration options
2. **Type Safety**: Full TypeScript support with Zod validation
3. **Versioning**: Options changes are tracked in prompt history
4. **Backward Compatibility**: Optional property doesn't break existing prompts
5. **API Consistency**: Follows established patterns for request/response handling

## Future Enhancements

The options structure is designed to be extensible. Potential future options include:
- `maxTokens`: Override default token limits
- `temperature`: Control response randomness
- `systemPrompt`: Add system-level instructions
- `outputFormat`: Specify preferred response format
- `timeout`: Custom execution timeout values

## Usage Examples

### Creating a Prompt with Options
```typescript
const createRequest = {
  name: "File Analysis Prompt",
  prompt: "Please analyze the uploaded file and provide insights.",
  options: {
    acceptFileUpload: true
  }
};
```

### Updating Prompt Options
```typescript
const updateRequest = {
  options: {
    acceptFileUpload: false
  }
};
// This will create a new version due to options change
```

This implementation provides a solid foundation for prompt configuration while maintaining the system's type safety and versioning capabilities.
