25-07-08_23-52

# Schedule Execution Dialog Component

## Overview
Extracted the schedule execution dialog into a reusable component and added clone functionality to the ExecutionsTable. This refactoring improves code maintainability and provides users with the ability to easily clone existing executions with modified settings.

## Implementation Details

### 1. Shared Dialog Component
- **File**: `ui/src/components/executions/ScheduleExecutionDialog.vue`
- **Purpose**: Reusable dialog for scheduling new executions or cloning existing ones
- **Features**:
  - Dynamic model loading using the new `getAvailableModels()` API
  - Pre-population support for cloning scenarios
  - Execution options configuration (temperature, maxTokens, topP, topK)
  - Provider:model format validation
  - Success/error handling with user feedback

### 2. Component Interface

#### Props
```typescript
interface Props {
    open: boolean                    // Dialog visibility state
    promptId?: string               // Required prompt ID for execution
    promptName?: string             // Display name for the prompt
    initialData?: {                 // Pre-populate data for cloning
        userInput: string
        providerModel: string
        options?: ExecutionOptions
    }
    sourceExecutionId?: string      // Source execution ID when cloning
}
```

#### Events
```typescript
interface Emits {
    'update:open': (value: boolean) => void    // Dialog state management
    'success': (executionId: string) => void   // Execution creation success
}
```

### 3. Updated Components

#### PromptsTable.vue Refactoring
- **Removed**: Inline schedule execution dialog and related logic
- **Added**: Import and usage of `ScheduleExecutionDialog` component
- **Simplified**: Reduced component complexity by ~100 lines of code
- **Maintained**: All existing functionality and user experience

#### ExecutionsTable.vue Enhancement
- **Added**: Clone button (Copy icon) for each execution row
- **Added**: Clone functionality that pre-populates dialog with execution data
- **Added**: Import and usage of `ScheduleExecutionDialog` component
- **Enhanced**: User can now easily re-run executions with modifications

### 4. Clone Functionality

#### User Experience Flow
1. User clicks Clone button on any execution row
2. Dialog opens with all fields pre-populated from the original execution:
   - User input text
   - Provider:model selection
   - All execution options (temperature, maxTokens, etc.)
3. User can modify any settings before submitting
4. New execution is created with the modified settings
5. Tables refresh to show the new execution

#### Data Transformation
```typescript
// Original execution data
const execution = {
    user_input: "Analyze this text...",
    provider: "ollama",
    model: "llama2",
    options: { temperature: 0.7, maxTokens: 1000 }
}

// Transformed for dialog
const cloneData = {
    userInput: execution.user_input,
    providerModel: `${execution.provider}:${execution.model}`, // "ollama:llama2"
    options: execution.options
}
```

## Technical Benefits

### Code Reusability
- Single dialog component used in both PromptsTable and ExecutionsTable
- Consistent UI/UX across different contexts
- Centralized execution scheduling logic

### Maintainability
- Reduced code duplication by ~150 lines
- Single source of truth for execution dialog logic
- Easier to add new features or fix bugs

### Type Safety
- Proper TypeScript interfaces for all props and events
- Compile-time validation of component usage
- IntelliSense support for developers

### User Experience
- Consistent dialog behavior across the application
- Easy cloning of executions with ability to modify settings
- Clear visual feedback for clone vs. new execution scenarios

## API Integration

### Model Loading
- Uses the new `getAvailableModels()` API endpoint
- Dynamically populates provider:model dropdown
- Handles loading states and error scenarios
- Automatically formats models in correct `provider:model` format

### Execution Creation
- Maintains existing execution creation API
- Proper validation of required fields
- Comprehensive error handling and user feedback

## File Structure
```
ui/src/components/
├── executions/
│   ├── ExecutionsTable.vue (enhanced with clone functionality)
│   └── ScheduleExecutionDialog.vue (new shared component)
└── prompts/
    └── PromptsTable.vue (refactored to use shared dialog)
```

## Future Enhancements

1. **Execution Templates**: Save common execution configurations as templates
2. **Batch Cloning**: Clone multiple executions at once
3. **Advanced Options**: Add more execution parameters as they become available
4. **Execution History**: Show execution lineage when cloning
5. **Quick Actions**: Add preset buttons for common modifications (e.g., "Increase Temperature")

## Testing Scenarios

### New Execution (from Prompts)
1. Navigate to Prompts page
2. Click "Schedule Execution" on any prompt
3. Fill in user input and select model
4. Verify execution is created successfully

### Clone Execution
1. Navigate to Executions page
2. Click "Clone" button on any execution
3. Verify all fields are pre-populated correctly
4. Modify any settings and submit
5. Verify new execution is created with modified settings

### Error Handling
1. Test with invalid user input
2. Test with no models available
3. Test network errors during submission
4. Verify appropriate error messages are shown
