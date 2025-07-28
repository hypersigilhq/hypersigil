# Prompt Accept File Upload Option Implementation

**Date:** 2025-07-28 12:55  
**Feature:** Accept File Upload Option for Prompts

## Overview

Implemented a new option setting for prompts that allows enabling/disabling file upload support. This feature adds a toggle switch in the prompt creation/editing dialog to control whether a prompt accepts file uploads as part of user input.

## Technical Implementation

### Frontend Changes

#### PromptsTable.vue Updates
- **Switch Component Integration**: Added a Switch component to the prompt dialog for toggling file upload acceptance
- **Form Data Enhancement**: Extended `formData` reactive object to include `options` property with `acceptFileUpload` boolean
- **Dialog Management**: Updated all dialog management functions (`openCreateDialog`, `editPrompt`, `clonePrompt`) to properly handle the options property
- **API Integration**: Modified `savePrompt` function to include options in API requests for both create and update operations

#### ViewPromptDialog.vue Updates
- **Options Display Section**: Added a new collapsible "Options" section to display prompt configuration settings
- **Visual Status Indicators**: Implemented status indicators with colored dots (green for enabled, gray for disabled)
- **Toggle Visibility**: Added switch control to show/hide the options section, similar to JSON schema sections
- **Consistent Styling**: Maintained design consistency with existing dialog sections

#### UI/UX Features
- **Toggle Switch**: Clean switch component positioned next to the "Accept file upload" label
- **Descriptive Text**: Added helpful description explaining the feature's purpose
- **State Persistence**: Options are properly loaded when editing or cloning existing prompts
- **Default Values**: New prompts default to `acceptFileUpload: false`

### API Integration

#### Type Safety
- Leverages existing `PromptOptionsSchema` from API definitions
- Uses typed `CreatePromptRequest` interface ensuring type safety
- Proper handling of optional options property with fallback defaults

#### Data Flow
1. **Create Flow**: New prompts include options in the creation request
2. **Edit Flow**: Existing prompt options are loaded and can be modified
3. **Clone Flow**: Options are copied from the source prompt
4. **Persistence**: Options are saved to the backend via the existing API endpoints

## User Experience

### Interface Design
- **Intuitive Toggle**: Switch component provides clear on/off state indication
- **Contextual Placement**: Located in the right column of the dialog alongside other prompt configuration options
- **Helpful Description**: Clear explanation of what enabling the option does
- **Consistent Styling**: Follows existing design patterns from the PromptsTable component

### Workflow Integration
- **Seamless Integration**: Works with existing create, edit, and clone workflows
- **State Management**: Proper state handling ensures no data loss during dialog operations
- **Error Handling**: Integrated with existing error handling and toast notification system

## Technical Architecture

### Component Structure
```typescript
// Form data structure
const formData = reactive<CreatePromptRequest>({
    name: '',
    prompt: '',
    json_schema_response: {},
    json_schema_input: {},
    options: {
        acceptFileUpload: false
    }
})
```

### Switch Implementation
```vue
<Switch 
    id="acceptFileUpload"
    :model-value="formData.options?.acceptFileUpload || false" 
    @update:model-value="(v: boolean) => {
        if (!formData.options) formData.options = {};
        formData.options.acceptFileUpload = v;
    }" 
/>
```

### API Integration
```typescript
const promptData: CreatePromptRequest = {
    name: formData.name,
    prompt: formData.prompt,
    options: formData.options
}
```

## Benefits

### For Users
- **Clear Control**: Easy-to-understand toggle for enabling file upload functionality
- **Flexible Configuration**: Can be set per prompt based on specific needs
- **Visual Feedback**: Clear indication of current setting state

### For Developers
- **Type Safety**: Full TypeScript support with proper type definitions
- **Maintainable Code**: Clean integration with existing codebase patterns
- **Extensible Design**: Options structure allows for easy addition of future prompt configuration options

## Future Enhancements

### Potential Extensions
- Additional prompt options (e.g., response format preferences, execution timeouts)
- Bulk options management for multiple prompts
- Options templates for common configurations
- Advanced file upload restrictions (file types, size limits)

### Integration Opportunities
- Connect with execution system to respect file upload settings
- UI indicators in prompt lists showing which prompts accept files
- Enhanced scheduling dialog to show file upload capabilities

## Implementation Quality

### Code Quality
- **Clean Integration**: Follows existing code patterns and conventions
- **Proper Error Handling**: Integrated with existing error management system
- **State Management**: Proper reactive state handling with Vue 3 Composition API
- **Type Safety**: Full TypeScript integration with proper type definitions

### User Experience
- **Intuitive Design**: Clear, self-explanatory interface elements
- **Consistent Behavior**: Works seamlessly with existing prompt management workflows
- **Responsive Design**: Maintains existing responsive layout patterns

This implementation provides a solid foundation for prompt-level configuration options while maintaining the high quality and consistency of the existing codebase.
