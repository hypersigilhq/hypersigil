# Schedule Execution Dialog Preview Feature

## Overview
Added a preview functionality to the ScheduleExecutionDialog component that allows users to preview the compiled prompt before scheduling an execution. This feature uses the existing prompt preview endpoint to show how the prompt template will be rendered with the provided user input.

## Implementation Details

### Frontend Changes

#### API Client Updates
- Added `preview` method to `promptsApi` in `ui/src/services/api-client.ts`
- Imported `PreviewPromptRequest` type from prompt definitions
- Method calls the `/api/v1/prompts/preview` endpoint with proper type safety

#### ScheduleExecutionDialog Component Updates
- Added preview state management:
  - `showPreviewDialog`: Controls preview dialog visibility
  - `previewLoading`: Loading state for preview requests
  - `previewResult`: Stores the compiled prompt result
  - `previewError`: Stores any preview errors

- Added `previewDisabled` computed property that disables the preview button when:
  - Preview is currently loading
  - User input is empty
  - No prompt is selected (either promptText for text mode or promptId for other modes)

- Added `showPreview` method that:
  - Validates required fields
  - Calls the preview API with appropriate data based on mode
  - Handles different modes (text, item, group)
  - Shows success/error states

- Added preview dialog UI:
  - Modal dialog showing compiled prompt
  - Error handling display
  - Formatted preview with proper whitespace preservation
  - Close button to dismiss the dialog

#### UI Components
- Added "Preview Compiled Prompt" button in the DialogFooter
- Button is positioned between Cancel and Schedule Execution buttons
- Button shows loading state when preview is being fetched
- Button is disabled when required fields are missing

### Mode Support
The preview feature works across all dialog modes:

1. **Text Mode**: Uses `promptText` directly from form input
2. **Item Mode**: Uses `promptId` from the selected prompt
3. **Group Mode**: Uses `promptId` from props (pre-selected prompt)

### User Experience
- Users can preview how their prompt template will be compiled with their input data
- Preview shows the exact prompt that would be sent to AI providers
- Helps users validate their prompt templates and input data before execution
- Error messages are displayed if preview fails
- Loading states provide feedback during API calls

### Technical Architecture
- Leverages existing prompt preview endpoint (`POST /api/v1/prompts/preview`)
- Uses Mustache templating engine on the backend for compilation
- Maintains type safety with TypeScript interfaces
- Follows existing component patterns and UI design system

## Benefits
1. **Validation**: Users can verify their prompt compilation before execution
2. **Debugging**: Helps identify issues with prompt templates or input data
3. **Confidence**: Users can see exactly what will be sent to AI providers
4. **Efficiency**: Reduces failed executions due to template errors

## Usage
1. Fill in the required fields (prompt and user input)
2. Click "Preview Compiled Prompt" button
3. Review the compiled prompt in the preview dialog
4. Make adjustments if needed
5. Close preview and proceed with scheduling execution

This feature enhances the user experience by providing transparency and validation capabilities before executing prompts with AI providers.
