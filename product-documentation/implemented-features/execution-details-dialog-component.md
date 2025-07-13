# Execution Details Dialog Component

## Overview
The `ExecutionDetailsDialog` component is a reusable Vue component that displays detailed information about a specific execution in a full-screen dialog.

## Key Features
- Displays comprehensive execution details in a structured, readable format
- Supports various execution statuses (pending, running, completed, failed)
- Shows execution metadata including:
  - Status badge
  - Provider and model information
  - Timestamps (created, started, completed)
  - Duration
  - Token usage
- Displays error messages and validation errors when applicable
- Shows full user input and execution result
- Supports displaying execution options

## Implementation Details
- Located at: `ui/src/components/executions/ExecutionDetailsDialog.vue`
- Uses Vue 3 Composition API
- Leverages shadcn/ui components for consistent styling
- Accepts an execution object as a prop
- Emits events for dialog state management

## Design Considerations
- Follows UI/UX guidelines from PromptsTable.vue
- Responsive design with grid layout
- Handles different execution states gracefully
- Provides clear, readable formatting for complex data

## Accessibility
- Proper ARIA labels
- Keyboard navigable
- Screen reader compatible

## Performance
- Efficient rendering of execution details
- Minimal re-renders through computed properties
