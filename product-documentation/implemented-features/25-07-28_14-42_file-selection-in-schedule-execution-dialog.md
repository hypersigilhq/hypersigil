# File Selection in Schedule Execution Dialog

**Date:** 2025-07-28 14:42  
**Status:** ✅ Completed

## Overview

Enhanced the ScheduleExecutionDialog component to support file selection when prompts have the `acceptFileUpload` option enabled. This allows users to attach files to executions for multimodal AI interactions.

## Implementation Details

### Frontend Changes

#### ScheduleExecutionDialog.vue Updates
- **Added FileSelector Component**: Integrated the existing FileSelector component into the execution dialog
- **Conditional Display**: File selector only appears when:
  - A prompt is selected (either via `promptId` prop or `formData.promptId` for item mode)
  - The prompt has `options.acceptFileUpload` set to `true`
- **Form Data Integration**: Added `fileId` field to the reactive form data object
- **API Integration**: Selected `fileId` is included in execution creation requests when a file is selected
- **Reset Functionality**: File selection is properly reset when the form is cleared

#### Key Features
1. **Smart Visibility**: File selector appears only for prompts that support file uploads
2. **Optional Selection**: File selection is optional - users can proceed without selecting a file
3. **Multi-Mode Support**: Works across all dialog modes (group, item, text) where applicable
4. **Type Safety**: Proper TypeScript integration with existing form validation

### Technical Implementation

#### Form Data Structure
```typescript
const formData = reactive({
    // ... existing fields
    fileId: '',
    // ... other fields
})
```

#### Conditional Rendering Logic
```vue
<div v-if="(promptId || formData.promptId) && promptData?.options?.acceptFileUpload">
    <FileSelector v-model="formData.fileId" label="File (Optional)" />
</div>
```

#### API Request Integration
```typescript
// Include fileId if selected
if (formData.fileId) {
    executionData.fileId = formData.fileId
}
```

### User Experience

#### Workflow
1. User opens Schedule Execution dialog for a prompt with file upload enabled
2. File selector appears below prompt selection/text input
3. User can optionally select a file from their uploaded files
4. Selected file is included in the execution request
5. AI providers receive both text input and file data for multimodal processing

#### UI/UX Considerations
- **Clear Labeling**: File selector is labeled as "File (Optional)" to indicate it's not required
- **Consistent Placement**: File selector appears in logical order within the form flow
- **Responsive Design**: Integrates seamlessly with existing dialog layout
- **Error Handling**: Proper error states and validation maintained

### Integration Points

#### Backend API
- Leverages existing `fileId` field in execution creation API
- No backend changes required - API already supported file attachments

#### File Management
- Uses existing FileSelector component for consistent file selection UX
- Integrates with existing file upload and management system
- Maintains file metadata and validation

#### Provider Support
- Works with existing provider file upload capabilities
- Respects provider-specific file upload support via `supportsFileUpload` flag
- Maintains compatibility with existing multimodal AI interactions

### Benefits

1. **Multimodal Capabilities**: Enables users to attach images, documents, and other files to prompt executions
2. **Seamless Integration**: Builds on existing file management and execution systems
3. **User-Friendly**: Optional file selection doesn't complicate the execution workflow
4. **Provider Agnostic**: Works with any AI provider that supports file uploads
5. **Type Safe**: Full TypeScript support with proper validation

### Future Enhancements

- **Multiple File Selection**: Could be extended to support multiple file attachments
- **File Preview**: Could add file preview functionality within the dialog
- **Drag & Drop**: Could integrate drag-and-drop file selection
- **File Type Validation**: Could add prompt-specific file type restrictions

## Testing Considerations

- Verify file selector appears only for prompts with `acceptFileUpload: true`
- Test file selection and deselection functionality
- Confirm selected files are properly included in execution requests
- Validate form reset behavior includes file selection
- Test across all dialog modes (group, item, text)
- Verify integration with existing file management system
