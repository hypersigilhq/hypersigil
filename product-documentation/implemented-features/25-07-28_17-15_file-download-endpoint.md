# File Download Endpoint Implementation

**Date:** 25-01-28_17-15  
**Feature:** File Download Endpoint for Base64 Stored Files

## Overview

Implemented a secure file download endpoint that decodes base64-encoded file data and streams it to clients with appropriate HTTP headers for file downloads.

## Technical Implementation

### API Definition Updates

**File:** `backend/src/api/definitions/file.ts`

Added new download endpoint definition:
```typescript
download: {
    method: 'GET',
    path: '/:id/download',
    params: FileParamsSchema,
    responses: CreateResponses({
        200: z.any(), // Binary response - file stream
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
    })
}
```

### Handler Implementation

**File:** `backend/src/api/handlers/file.ts`

Implemented download handler with the following features:

#### Core Functionality
- **File Retrieval**: Fetches file by ID from database using `fileModel.findById()`
- **Base64 Decoding**: Converts stored base64 data to binary buffer using `Buffer.from(file.data, 'base64')`
- **Binary Streaming**: Uses `res.send(fileBuffer)` to stream file content directly

#### HTTP Headers
- **Content-Type**: Set to file's stored MIME type for proper browser handling
- **Content-Length**: Set to buffer length for download progress indication
- **Content-Disposition**: Set to `attachment` with encoded original filename for forced download
- **Cache-Control**: Set to `no-cache` to prevent caching of potentially sensitive files

#### Error Handling
- **404 Response**: When file ID not found in database
- **500 Response**: For server errors during file processing or streaming
- **Proper Logging**: All errors logged with context for debugging

## Security Considerations

- **Authentication Required**: Endpoint protected by `authMiddleware`
- **UUID Validation**: File ID parameter validated as UUID format
- **Filename Encoding**: Original filename properly encoded to prevent header injection
- **No Data Exposure**: File content only streamed, never exposed in JSON responses

## Usage

### Endpoint URL
```
GET /api/v1/files/:id/download
```

### Response
- **Success (200)**: Binary file stream with appropriate headers
- **Not Found (404)**: JSON error response when file doesn't exist
- **Server Error (500)**: JSON error response for processing failures

### Example Usage
```javascript
// Direct download link
const downloadUrl = `/api/v1/files/${fileId}/download`;

// Programmatic download
fetch(downloadUrl)
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  });
```

## Integration Points

- **File Model**: Uses existing `fileModel.findById()` method
- **Authentication**: Integrates with existing auth middleware
- **API Architecture**: Follows established ts-typed-api patterns
- **Error Handling**: Consistent with other API endpoints

## UI Integration

**File:** `ui/src/components/files/FilesTable.vue`

Added download functionality to the files table:

#### Download Button
- **Icon**: Download icon from Lucide Vue Next
- **Position**: Added between View and Delete buttons in actions column
- **Styling**: Ghost variant with hover effects matching other action buttons

#### Download Function
```typescript
const downloadFile = (file: FileResponse) => {
    // Construct download URL using API definition prefix and path
    const downloadUrl = `/api/v1/files/${file.id}/download`
    
    // Open in new tab to trigger download
    window.open(downloadUrl, '_blank')
}
```

#### User Experience
- **Click Action**: Opens download URL in new tab to trigger browser download
- **URL Construction**: Uses API definition prefix (`/api/v1/files`) and path pattern (`/:id/download`)
- **Browser Handling**: Leverages browser's native download behavior with proper headers
- **File Naming**: Browser uses `Content-Disposition` header for original filename

## Performance Considerations

- **Memory Efficient**: Converts base64 to buffer only when needed
- **Direct Streaming**: Uses Express `res.send()` for efficient binary transfer
- **No Caching**: Prevents memory buildup from cached file data
- **Content-Length Header**: Enables browser download progress indicators

## Future Enhancements

- **Range Requests**: Support for partial content downloads (HTTP 206)
- **Compression**: Optional gzip compression for text-based files
- **Access Logging**: Track file download events for audit purposes
- **Rate Limiting**: Prevent abuse of download endpoint
