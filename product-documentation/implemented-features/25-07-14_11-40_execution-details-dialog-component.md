25-07-14_11-40

# Execution Details Dialog Component Refactoring

## Overview
The ExecutionDetailsDialog component has been refactored to improve reusability and maintainability by splitting it into two components:

1. **ExecutionDetailsView**: A standalone component that can be used to display execution details in various contexts.
2. **ExecutionDetailsDialog**: A dialog wrapper that uses ExecutionDetailsView for displaying execution details in a full-screen modal.

## Key Changes
- Created `ui/src/components/executions/ExecutionDetailsView.vue`
  - Contains all the logic for rendering execution details
  - Can be embedded in other components or views
  - Maintains all existing functionality from the original component
  - Accepts an `execution` prop of type `ExecutionResponse`

- Created `ui/src/components/executions/ExecutionDetailsDialog.vue`
  - Wraps ExecutionDetailsView in a full-screen dialog
  - Preserves the original dialog behavior with `modelValue` and `open` computed property
  - Emits `update:modelValue` and `close` events

## Benefits
- Improved Component Reusability: ExecutionDetailsView can now be used in multiple contexts beyond the full-screen dialog
- Better Separation of Concerns: Dialog-specific logic is separated from content rendering
- Easier Maintenance: Smaller, more focused components are easier to understand and modify

## Usage Examples

### In Dialog (Original Use Case)
```vue
<ExecutionDetailsDialog 
  v-model="isDialogOpen" 
  :execution="selectedExecution" 
  @close="closeDialog" 
/>
```

### Embedded in Another View
```vue
<template>
  <div>
    <ExecutionDetailsView :execution="execution" />
  </div>
</template>
```

## Considerations
- The component maintains all previous functionality
- Preserves responsive grid layout
- Keeps existing state management for prompt loading and column visibility
- Maintains type safety with TypeScript

## Future Improvements
- Consider adding more flexible layout options to ExecutionDetailsView
- Potentially extract utility functions to a shared service
