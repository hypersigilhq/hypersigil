# Test Data Bulk Selection and Scheduling

## Overview
Enhanced the TestDataItemsTable component with checkbox-based multi-selection functionality and bulk scheduling capabilities, allowing users to select multiple test data items and schedule executions for all selected items simultaneously.

## Features Implemented

### 1. Multi-Selection Interface
- **Header Checkbox**: Master checkbox in table header for select all/none functionality
- **Row Checkboxes**: Individual checkboxes in first column of each row
- **Visual Feedback**: Selected rows highlighted with blue background (`bg-blue-50`)
- **Indeterminate State**: Header checkbox shows indeterminate state when some (but not all) items are selected

### 2. Bulk Action Bar
- **Contextual Display**: Appears only when items are selected
- **Selection Counter**: Shows "X item(s) selected" with proper pluralization
- **Clear Selection**: Button to deselect all items
- **Bulk Schedule**: Primary action button to schedule execution for all selected items
- **Consistent Styling**: Blue theme matching the selection highlight

### 3. Selection Management
- **Efficient State Tracking**: Uses `Set<string>` for O(1) selection operations
- **Toggle Functionality**: Click to select/deselect individual items
- **Select All Logic**: Smart toggle - selects all if none/some selected, clears if all selected
- **Auto-Clear**: Selection automatically cleared when items change (pagination, search, etc.)

### 4. Bulk Scheduling Integration
- **ScheduleExecutionDialog Integration**: Leverages existing dialog in "item" mode
- **Multiple User Inputs**: Passes array of selected item content to dialog
- **Prompt Selection Required**: User must select prompt for bulk execution
- **Provider/Model Selection**: Standard execution options available
- **Success Handling**: Clears selection and bulk inputs after successful scheduling

## Technical Implementation

### State Management
```typescript
// Selection state
const selectedItems = ref<Set<string>>(new Set())
const bulkUserInputs = ref<string[]>([])
```

### Key Functions
- `toggleItemSelection(itemId: string)`: Toggle individual item selection
- `toggleAllSelection()`: Smart select all/none functionality
- `clearSelection()`: Clear all selections
- `bulkScheduleItems()`: Prepare and open dialog for bulk scheduling

### Dialog Integration
```vue
<ScheduleExecutionDialog 
  v-model:open="showScheduleDialog" 
  mode="item"
  :initial-user-input="schedulingItem?.content ? [schedulingItem.content] : bulkUserInputs.length > 0 ? bulkUserInputs : undefined"
  @success="onScheduleSuccess" 
/>
```

## User Experience Flow

1. **Selection Phase**
   - User selects multiple items via checkboxes
   - Bulk action bar appears showing selection count
   - Visual feedback with row highlighting

2. **Bulk Scheduling**
   - User clicks "Schedule Execution" in bulk action bar
   - ScheduleExecutionDialog opens in item mode
   - Dialog shows "Multiple user input provided, will schedule X executions"

3. **Configuration**
   - User selects required prompt
   - User configures providers/models and execution options
   - System validates selections

4. **Execution**
   - System creates multiple executions (one per selected item)
   - Success message shows execution IDs
   - Selection automatically cleared

## Accessibility Features
- **ARIA Labels**: Proper labels for all checkboxes
- **Keyboard Navigation**: Standard checkbox keyboard interaction
- **Screen Reader Support**: Clear indication of selection state
- **Semantic HTML**: Proper table structure with role attributes

## Design Consistency
- **Color Scheme**: Blue theme (`bg-blue-50`, `border-blue-200`, `text-blue-900`)
- **Button Styling**: Consistent with existing UI patterns
- **Spacing**: Follows established design system
- **Typography**: Matches existing table typography

## Performance Considerations
- **Efficient Selection**: Set-based operations for O(1) lookups
- **Minimal Re-renders**: Optimized state updates
- **Memory Management**: Proper cleanup of selections and bulk inputs

## Future Enhancements
- **Bulk Delete**: Extend pattern for bulk deletion operations
- **Bulk Edit**: Support for bulk editing of selected items
- **Selection Persistence**: Maintain selection across page navigation
- **Export Selected**: Export functionality for selected items
- **Advanced Filters**: Filter-based selection options

## Integration Points
- **ScheduleExecutionDialog**: Reuses existing execution scheduling logic
- **Test Data API**: Leverages existing item management endpoints
- **UI Components**: Uses established shadcn/ui component library
- **State Management**: Follows Vue 3 Composition API patterns

This implementation provides a robust, accessible, and user-friendly bulk selection and scheduling system that integrates seamlessly with the existing test data management infrastructure.
