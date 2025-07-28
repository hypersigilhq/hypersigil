# File Upload Tags Functionality

**Date:** 25-07-28_16-10  
**Feature:** Tag support for file uploads in FileUploadDialog component

## Overview

Enhanced the FileUploadDialog component to support adding tags that apply to all uploaded files. Users can now add multiple tags using an intuitive interface with badge-style display and easy removal functionality.

## Implementation Details

### UI Components Added

1. **Tags Input Section**
   - Text input field for adding new tags
   - Support for Enter key and comma key to add tags
   - Input is disabled during upload process

2. **Tags Display**
   - Tags displayed as secondary variant badges
   - Clickable badges with X icon for removal
   - Responsive flex-wrap layout for multiple tags
   - Helper text explaining removal functionality

3. **Tag Management Functions**
   - `addTag()`: Adds trimmed, unique tags to the collection
   - `removeTag(index)`: Removes tag at specified index
   - Automatic input clearing after tag addition
   - Duplicate tag prevention

### Backend Integration

- Tags are included in the `CreateFileRequest` payload
- Tags array is sent only when tags exist (undefined otherwise)
- All files in a batch upload receive the same tags
- Leverages existing API support for tags in file model

### User Experience Features

- **Keyboard Shortcuts**: Enter and comma keys both trigger tag addition
- **Visual Feedback**: Tags displayed as interactive badges with hover effects
- **Input Validation**: Trims whitespace and prevents duplicate tags
- **State Management**: Tags reset when dialog closes or is cancelled
- **Upload Integration**: Tags disabled during upload process

### Technical Implementation

```typescript
// Reactive state for tag management
const tagInput = ref('')
const tags = ref<string[]>([])

// Tag management functions
const addTag = () => {
    const trimmedTag = tagInput.value.trim()
    if (trimmedTag && !tags.value.includes(trimmedTag)) {
        tags.value.push(trimmedTag)
        tagInput.value = ''
    }
}

const removeTag = (index: number) => {
    tags.value.splice(index, 1)
}

// Integration with file upload
const fileData: CreateFileRequest = {
    // ... other file properties
    tags: tags.value.length > 0 ? tags.value : undefined
}
```

### UI Layout

The tags section is positioned between the file selection area and the file list, providing a logical flow:

1. Select files
2. Add tags (applies to all files)
3. Review file list with individual file settings
4. Upload with tags applied

## Benefits

- **Batch Tagging**: Apply tags to multiple files simultaneously
- **Improved Organization**: Better file categorization and searchability
- **User-Friendly Interface**: Intuitive tag input with visual feedback
- **Consistent UX**: Follows existing design patterns with shadcn/ui components
- **Efficient Workflow**: Streamlined process for organizing uploaded files

## Files Modified

- `ui/src/components/files/FileUploadDialog.vue`
  - Added tags input section to template
  - Imported Badge component
  - Added reactive state for tag management
  - Implemented tag addition/removal functions
  - Integrated tags with file upload process
  - Enhanced dialog cleanup to reset tags

## Future Enhancements

- Tag autocomplete based on existing file tags
- Tag validation and character limits
- Predefined tag suggestions
- Tag-based file filtering in files table
- Bulk tag editing for existing files
