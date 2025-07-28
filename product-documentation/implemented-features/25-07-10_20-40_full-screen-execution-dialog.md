25-07-10_20-40

# Full Screen Execution Dialog

## Overview
Enhanced the execution details dialog in the ExecutionsTable component to provide a full-screen viewing experience with proper content overflow handling and scrollable containers.

## Implementation Details

### Dialog Layout Changes
- **Full Screen**: Dialog now takes up the entire viewport (`w-screen h-screen max-w-none max-h-none m-0 rounded-none`)
- **Flex Layout**: Implemented a proper flex column layout with header, content, and footer sections
- **Responsive Design**: Content area adapts to different screen sizes with responsive grid layout

### Scrollable Content Areas
- **User Input Container**: Individual scrollbar for long user prompts
- **Result Container**: Individual scrollbar for execution results
- **Error Message Container**: Limited height with scrollbar for error messages
- **Execution Options**: Limited height with scrollbar for JSON options

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header (fixed)                      │
├─────────────────────────────────────┤
│ Status & Provider Info (fixed)      │
├─────────────────────────────────────┤
│ Timestamps (fixed)                  │
├─────────────────────────────────────┤
│ ┌─────────────┬────────────────────┐│
│ │ User Input  │ Result             ││
│ │ (scrollable)│ (scrollable)       ││
│ │             │                    ││
│ └─────────────┴────────────────────┘│
├─────────────────────────────────────┤
│ Error Message (scrollable if needed)│
├─────────────────────────────────────┤
│ Options (scrollable if needed)      │
├─────────────────────────────────────┤
│ Footer (fixed)                      │
└─────────────────────────────────────┘
```

### Key CSS Classes Used
- `flex flex-col`: Main container layout
- `flex-shrink-0`: Prevents header/footer from shrinking
- `flex-1`: Makes content area take remaining space
- `overflow-hidden`: Prevents content overflow
- `overflow-auto`: Adds scrollbars when needed
- `min-h-0`: Ensures proper flex behavior with scrolling
- `grid-cols-1 lg:grid-cols-2`: Responsive layout for content areas

### User Experience Improvements
1. **Better Content Visibility**: Full screen provides maximum space for viewing execution details
2. **No Content Overflow**: All content areas have proper scrolling when needed
3. **Responsive Layout**: Works well on different screen sizes
4. **Maintained Usability**: Header and footer remain accessible at all times

### Technical Benefits
- **Maintainable Code**: Clean flex-based layout structure
- **Performance**: Efficient scrolling implementation
- **Accessibility**: Proper focus management and keyboard navigation
- **Cross-browser Compatibility**: Uses standard CSS flexbox and grid

## Files Modified
- `ui/src/components/executions/ExecutionsTable.vue`: Enhanced dialog layout and scrolling behavior

## Usage
Users can now click the "View" button (eye icon) on any execution in the table to open a full-screen dialog that displays all execution details with proper scrolling for long content.
