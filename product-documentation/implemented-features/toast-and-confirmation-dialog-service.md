# Toast and Confirmation Dialog Service

## Overview
Implemented a comprehensive UI service system providing toast notifications and modal confirmation dialogs for the application. The service follows Vue 3 Composition API patterns and integrates seamlessly with the existing shadcn/ui design system.

## Features Implemented

### Toast Service
- **Location**: `ui/src/components/ui/toast/`
- **Components**:
  - `Toast.vue` - Individual toast component with variants
  - `ToastContainer.vue` - Global container managing multiple toasts
  - `useToast.ts` - Composable for programmatic toast management
  - `index.ts` - Exports and type definitions

#### Toast Variants
- `success` - Green styling for successful operations
- `error` - Red styling for error messages
- `warning` - Yellow styling for warnings
- `info` - Blue styling for informational messages
- `default` - Standard styling

#### Toast Features
- Auto-dismiss with configurable duration (default: 5 seconds)
- Manual dismiss capability with close button
- Queue management for multiple simultaneous toasts
- Smooth animations using Tailwind transitions
- Proper accessibility (ARIA labels, screen reader support)
- Action buttons support
- Responsive positioning (top-right on desktop, top on mobile)

### Confirmation Dialog Service
- **Location**: `ui/src/components/ui/confirmation-dialog/`
- **Components**:
  - `ConfirmationDialog.vue` - Reusable confirmation dialog component
  - `GlobalConfirmationDialog.vue` - Global instance for programmatic usage
  - `useConfirmationDialog.ts` - Composable for programmatic dialog management
  - `index.ts` - Exports and type definitions

#### Confirmation Dialog Features
- Customizable title, message, and button labels
- Default configuration with sensible defaults
- Promise-based API for easy async/await usage
- Icon support (warning, question, info, error)
- Button variants (default, destructive)
- Proper focus management and keyboard navigation
- Consistent with existing dialog patterns using Reka UI

## API Usage

### Toast Service
```typescript
import { useToast } from '@/components/ui/toast'
// or
import { useUI } from '@/services/ui'

const toast = useToast()
// or
const { success, error, warning, info } = useUI()

// Basic usage
toast.success('Operation completed successfully!')
toast.error('Something went wrong')
toast.warning('Please check your input')
toast.info('New update available')

// With options
toast.success('Saved!', {
  duration: 5000,
  dismissible: true,
  title: 'Success',
  action: {
    label: 'View',
    onClick: () => console.log('Action clicked')
  }
})
```

### Confirmation Dialog Service
```typescript
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
// or
import { useUI } from '@/services/ui'

const confirm = useConfirmationDialog()
// or
const { confirm, confirmDelete, confirmAction } = useUI()

// Simple confirmation
const result = await confirm('Are you sure you want to delete this item?')
if (result) {
  // User confirmed
}

// Custom configuration
const result = await confirm({
  title: 'Delete Item',
  message: 'This action cannot be undone. Are you sure?',
  confirmText: 'Delete',
  cancelText: 'Keep',
  variant: 'destructive',
  icon: 'warning'
})

// Convenience methods
const deleteConfirmed = await confirmDelete('User Account')
const actionConfirmed = await confirmAction('Export Data', 'This will export all user data to CSV.')
```

## Integration

### Global Setup
Both services are integrated into the main application:

```vue
<!-- App.vue -->
<template>
  <AppLayout />
  <ToastContainer />
  <GlobalConfirmationDialog />
</template>
```

### Combined Service
A unified service is available for convenience:

```typescript
import { useUI } from '@/services/ui'

const ui = useUI()

// Toast methods
ui.success('Success message')
ui.error('Error message')

// Confirmation methods
const confirmed = await ui.confirm('Are you sure?')
const deleteConfirmed = await ui.confirmDelete('Item Name')
```

## Technical Implementation

### Architecture
- **Global State Management**: Uses Vue 3 reactive refs for global state
- **Type Safety**: Full TypeScript support with proper type definitions
- **Accessibility**: ARIA labels, proper focus management, keyboard navigation
- **Responsive Design**: Mobile-first approach with responsive positioning
- **Animation**: Smooth transitions using Tailwind CSS animations
- **Memory Management**: Proper cleanup of timers and event listeners

### Design Consistency
- Follows existing shadcn/ui component patterns
- Uses Class Variance Authority (CVA) for consistent styling
- Integrates with existing button and dialog components
- Supports dark mode through Tailwind CSS classes
- Consistent spacing and typography with the design system

### Performance
- Lazy loading of dialog components
- Efficient queue management for toasts
- Minimal bundle size impact
- Proper cleanup to prevent memory leaks

## Benefits
1. **Consistent UX**: Standardized toast and confirmation patterns across the application
2. **Developer Experience**: Simple, intuitive API with TypeScript support
3. **Accessibility**: Built-in accessibility features
4. **Maintainability**: Centralized UI feedback system
5. **Flexibility**: Highly customizable while maintaining defaults
6. **Integration**: Seamless integration with existing design system
