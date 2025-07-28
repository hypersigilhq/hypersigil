25-07-08_23-11

# Schedule Execution from Prompts Table

## Overview
Added a "Schedule Execution" action to the prompts table that allows users to directly schedule prompt executions from the prompts view. This feature provides a seamless workflow for users to test and execute their prompts without navigating to a separate execution creation page.

## Implementation Details

### User Interface
- **Play Button**: Added a Play icon button in the actions column of each prompt row
- **Schedule Dialog**: Modal dialog with form fields for execution configuration
- **Success Feedback**: Green success message displayed after successful execution scheduling

### Form Fields
1. **User Input** (Required)
   - Textarea for entering the input text to process with the prompt
   - 4 rows height for comfortable text entry

2. **Provider/Model Selection** (Required)
   - Dropdown populated with available providers from the backend
   - Raw format display (e.g., "ollama:llama2")
   - Loading state while fetching providers
   - Error handling for provider loading failures

3. **Execution Options** (Optional)
   - **Temperature**: Number input (0-2 range, step 0.01, default: 0.01)
   - **Max Tokens**: Number input (minimum 1, placeholder: "Auto")
   - **Top P**: Number input (0-1 range, step 0.01, placeholder: "Auto")
   - **Top K**: Number input (minimum 1, placeholder: "Auto")

### Technical Implementation

#### State Management
```typescript
// Dialog and form state
const showScheduleDialog = ref(false)
const schedulingPrompt = ref<PromptResponse | null>(null)
const scheduling = ref(false)
const loadingProviders = ref(false)
const availableProviders = ref<string[]>([])
const successMessage = ref<string | null>(null)

// Form data with default values
const scheduleFormData = reactive({
    userInput: '',
    providerModel: '',
    options: {
        temperature: 0.01,
        maxTokens: undefined,
        topP: undefined,
        topK: undefined
    }
})
```

#### Key Functions
- `scheduleExecution(prompt)`: Opens dialog and loads providers
- `loadProviders()`: Fetches available providers from backend
- `submitScheduleExecution()`: Creates execution via API
- `closeScheduleDialog()`: Resets form and closes dialog

#### API Integration
- Uses `executionsApi.listProviders()` to fetch available providers
- Uses `executionsApi.create()` to schedule execution
- Proper error handling with user-friendly error messages
- Loading states during API calls

### User Experience Features

#### Default Values
- Temperature defaults to 0.01 as specified
- Other execution options are optional and use backend/provider defaults when not specified

#### Validation
- Required field validation for user input and provider selection
- Form submission disabled during loading states
- Clear error messages for API failures

#### Success Handling
- Success message displays execution ID for reference
- User stays on prompts page after scheduling (no redirect)
- Form remains open to allow multiple executions if needed

#### Error Handling
- Provider loading errors displayed to user
- Execution creation errors displayed with retry capability
- Network error handling with user-friendly messages

## User Workflow

1. User navigates to Prompts page
2. User clicks the Play button (▶️) on any prompt row
3. Schedule Execution dialog opens
4. Available providers are automatically loaded
5. User enters required input text
6. User selects provider/model from dropdown
7. User optionally configures execution options
8. User clicks "Schedule Execution"
9. Success message appears with execution ID
10. User can close dialog or schedule another execution

## Benefits

### Improved User Experience
- **Streamlined Workflow**: No need to navigate between pages
- **Context Preservation**: Prompt details are automatically associated
- **Quick Testing**: Easy to test prompts with different inputs
- **Immediate Feedback**: Success/error messages provide clear status

### Developer Experience
- **Type Safety**: Full TypeScript integration with existing API definitions
- **Reusable Components**: Uses existing UI components and patterns
- **Consistent Styling**: Matches existing application design
- **Maintainable Code**: Clean separation of concerns and proper state management

## Future Enhancements

### Potential Improvements
- **Quick Execute**: One-click execution with default settings
- **Execution History**: Show recent executions for each prompt
- **Batch Execution**: Execute multiple prompts simultaneously
- **Template Presets**: Save common execution configurations
- **Real-time Status**: Live updates of execution progress

### Integration Opportunities
- **Execution Results**: Direct link to view execution results
- **Prompt Optimization**: Suggest optimal execution parameters
- **Performance Metrics**: Track execution success rates per prompt
- **A/B Testing**: Compare different execution configurations

## Technical Notes

### Dependencies
- Existing execution API endpoints
- Provider health checking system
- UI component library (shadcn/ui)
- Vue 3 Composition API

### Performance Considerations
- Provider list is fetched only when dialog opens
- Form validation prevents unnecessary API calls
- Proper cleanup of reactive state on dialog close
- Debounced input handling where appropriate

### Security Considerations
- Input validation on both frontend and backend
- Proper error message sanitization
- Rate limiting considerations for execution creation
- User permission checks (when authentication is implemented)
