# PDF Size Limit in File Viewer Dialog

**Date:** 25-07-28_17-07  
**Feature:** PDF Size Limit with Download Option in File Viewer Dialog

## Overview

Enhanced the FileViewDialog component to handle large PDF files by implementing a 2MB size limit for in-browser PDF display. When a PDF exceeds this limit, users are presented with a clear message and download option instead of attempting to render the file in the browser.

## Implementation Details

### Size Check Logic
- Added `isPdfTooLarge` computed property that checks if a PDF file exceeds 2MB (2 * 1024 * 1024 bytes)
- Uses the file size from `props.file?.size` to determine if the limit is exceeded
- Only applies to PDF files (`application/pdf` MIME type)

### UI Changes
- **Small PDFs (≤2MB)**: Display normally in iframe viewer
- **Large PDFs (>2MB)**: Show informative message with:
  - Document icon (SVG)
  - "PDF Too Large to Display" heading
  - Explanation text about the 2MB limit
  - Current file size display using `formatFileSize` utility
  - Download button with download icon

### Download Functionality
- Added `downloadFile` function that creates a temporary download link
- Uses the base64 data URL from `downloadUrl` computed property
- Preserves original filename from `props.file.originalName`
- Automatically triggers download and cleans up the temporary link

### Technical Implementation
```typescript
const isPdfTooLarge = computed(() => {
    const maxPdfSize = 2 * 1024 * 1024 // 2MB in bytes
    return isPdf.value && (props.file?.size || 0) > maxPdfSize
})

const pdfDataUrl = computed(() => {
    if (!isPdf.value || !fileContent.value?.data || isPdfTooLarge.value) return ''
    return `data:application/pdf;base64,${fileContent.value.data}`
})
```

## User Experience Improvements

### Performance Benefits
- Prevents browser from attempting to render very large PDFs
- Reduces memory usage and potential browser crashes
- Faster dialog loading for large files

### Clear Communication
- Users immediately understand why the PDF cannot be displayed
- File size information helps users make informed decisions
- One-click download provides easy access to the file

### Consistent Design
- Follows existing dialog design patterns
- Uses consistent spacing, typography, and button styles
- Maintains accessibility with proper ARIA labels and keyboard navigation

## Files Modified

- `ui/src/components/files/FileViewDialog.vue`
  - Added size limit logic for PDFs
  - Enhanced template with conditional rendering
  - Added download functionality
  - Improved user messaging for large files

## Testing Considerations

- Test with PDFs of various sizes (under 2MB, exactly 2MB, over 2MB)
- Verify download functionality works across different browsers
- Ensure file size display is accurate and readable
- Test accessibility features (keyboard navigation, screen readers)
- Verify memory cleanup when dialog is closed

## Future Enhancements

- Consider making the size limit configurable
- Add progress indicator for large file downloads
- Implement chunked loading for very large files
- Add preview thumbnails for large PDFs
