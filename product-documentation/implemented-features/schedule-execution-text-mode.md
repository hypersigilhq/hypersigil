# Schedule Execution Text Mode

## Overview
Enhanced the `ScheduleExecutionDialog.vue` component to support a new "text" mode that allows users to input prompt text directly instead of selecting an existing prompt from the database.

## Implementation Details

### New Mode Support
- Added `'text'` as a new mode option alongside existing `'group'` and `'item'` modes
- The component now accepts `mode?: 'group' | 'item' | 'text'` as a prop

### UI Changes
- **Text Mode UI**: When `mode === 'text'`, displays a large textarea for prompt text input (6 rows)
- **Conditional Rendering**: Test data group selection is hidden in text mode (`mode !== 'text'`)
- **Form Validation**: Submit button is disabled when in text mode if either prompt text or user input is empty

### API Integration
- Leverages existing API support for `promptText` in the execution creation endpoint
- The API already supported either `promptId` or `promptText` through the `CreateExecutionRequestSchema`
- Text mode sends `promptText` and `userInput` directly to the API instead of `promptId`

### Form Data Structure
```typescript
const formData = reactive({
    promptId: '',
    promptText: '',        // New field for text mode
    userInput: '',
    userInputs: [] as string[],
    providerModel: <string[]>[],
    testDataGroupId: '',
    options: { ... }
})
```

### Props Interface Updates
```typescript
interface Props {
    open: boolean
    mode?: 'group' | 'item' | 'text'  // Added 'text' mode
    promptId?: string
    promptName?: string
    initialUserInput?: string[]
    initialData?: {
        userInput: string
        providerModel: string[]
        promptText?: string              // Added for text mode support
        options?: { ... }
    }
    sourceExecutionId?: string
}
```

### Execution Logic
- **Text Mode**: Uses `promptText` and `userInput` fields directly
- **Other Modes**: Uses `promptId` with optional test data groups or user input
- **Validation**: Different validation logic based on mode
  - Text mode: Requires both `promptText` and `userInput` to be non-empty
  - Other modes: Requires `promptId` to be provided

### Features Not Available in Text Mode
- Test data group selection (since there's no stored prompt to compile with test data)
- Multiple user inputs (simplified to single execution only)
- Prompt selection (replaced with direct text input)

## Usage Examples

### Basic Text Mode Usage
```vue
<ScheduleExecutionDialog
    :open="dialogOpen"
    mode="text"
    @update:open="dialogOpen = $event"
    @success="handleSuccess"
/>
```

### With Initial Data (for cloning)
```vue
<ScheduleExecutionDialog
    :open="dialogOpen"
    mode="text"
    :initial-data="{
        userInput: 'Sample input',
        promptText: 'You are a helpful assistant...',
        providerModel: ['openai:gpt-4'],
        options: { temperature: 0.7 }
    }"
    @update:open="dialogOpen = $event"
    @success="handleSuccess"
/>
```

## Benefits
1. **Quick Testing**: Users can quickly test prompt variations without creating new prompt records
2. **Experimentation**: Ideal for one-off executions and prompt experimentation
3. **Simplified Workflow**: Reduces the need to save prompts for temporary testing
4. **API Compatibility**: Leverages existing backend support for prompt text execution

## Technical Notes
- The backend API already supported `promptText` through the execution definitions
- No backend changes were required for this feature
- Form validation ensures both prompt text and user input are provided in text mode
- The component maintains backward compatibility with existing modes
