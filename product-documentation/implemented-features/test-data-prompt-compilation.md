# Test Data Prompt Compilation Feature

## Overview
Enhanced the ViewItemDialog component to support prompt compilation with test data items when the test data group is in 'json' mode. This feature allows users to preview how prompts will be rendered with specific test data before executing them.

## Implementation Details

### Frontend Changes

#### ViewItemDialog.vue Component
- **Conditional UI**: Added prompt compilation section that only appears when `group.mode === 'json'`
- **PromptSelector Integration**: Integrated the existing PromptSelector component to allow users to choose a prompt
- **Compilation Interface**: Added a "Compile Prompt" button with loading state management
- **Result Display**: Shows compiled prompt or compilation errors in a scrollable, copyable text area
- **State Management**: Proper reactive state management with cleanup on dialog close

#### Key Features
- **Mode Detection**: Only shows compilation UI for JSON mode test data groups
- **Real-time Feedback**: Loading states and error handling for better UX
- **Copy Functionality**: Users can copy both the compiled prompt and original content
- **Responsive Layout**: Maintains dialog responsiveness with proper spacing and overflow handling

### Backend Integration

#### API Client Enhancement
- **New Method**: Added `compilePrompt` method to `testDataApi.items`
- **Type Safety**: Properly typed request/response using existing API definitions
- **Error Handling**: Comprehensive error handling with user-friendly messages

#### API Endpoint Usage
- **Endpoint**: `POST /api/v1/test-data/compile-prompt`
- **Request**: `{ promptId: string, testDataItemId: string, promptVersion?: number }`
- **Response**: `{ success: boolean, compiledPrompt?: string, error?: string }`

## User Experience

### Workflow
1. User opens a test data item in a JSON mode group
2. Prompt compilation section appears at the top of the dialog
3. User selects a prompt from the dropdown
4. User clicks "Compile Prompt" button
5. System compiles the prompt using Mustache templating with the test data
6. Compiled result or error message is displayed
7. User can copy the compiled prompt for review or use

### UI/UX Improvements
- **Visual Hierarchy**: Clear separation between compilation section and content
- **Loading States**: Button shows "Compiling..." during API calls
- **Error Display**: Compilation errors are clearly highlighted in red
- **Copy Integration**: Consistent copy-to-clipboard functionality
- **State Reset**: Compilation state resets when dialog is closed

## Technical Architecture

### Component Structure
```
ViewItemDialog.vue
├── Prompt Compilation Section (JSON mode only)
│   ├── PromptSelector component
│   ├── Compile button with loading state
│   └── Result display area
└── Original Content Section
    └── Test data item content display
```

### State Management
- **selectedPromptId**: Tracks the selected prompt for compilation
- **isCompiling**: Loading state for compilation process
- **compiledPrompt**: Stores successful compilation result
- **compilationError**: Stores error messages from failed compilations

### API Integration
- Leverages existing `testDataApi` client structure
- Uses proper TypeScript types from API definitions
- Implements comprehensive error handling

## Benefits

### For Users
- **Preview Capability**: See exactly how prompts will render before execution
- **Debugging Support**: Identify template issues early in the process
- **Workflow Efficiency**: Streamlined prompt testing and validation
- **Copy Functionality**: Easy sharing and review of compiled prompts

### For Development
- **Type Safety**: Full TypeScript integration with existing API definitions
- **Reusable Components**: Leverages existing PromptSelector component
- **Consistent UX**: Follows established design patterns
- **Maintainable Code**: Clean separation of concerns and proper state management

## Future Enhancements
- Support for prompt version selection
- Batch compilation for multiple test data items
- Compilation history and caching
- Integration with execution scheduling from compilation results
