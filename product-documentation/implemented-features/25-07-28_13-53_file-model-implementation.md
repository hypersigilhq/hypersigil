# File Model Implementation

**Date:** 25-07-28_13-53  
**Feature:** Complete file model with upload data support

## Overview

Implemented a comprehensive file model system for handling file uploads with base64 encoded data storage. The system includes full CRUD operations, search capabilities, and metadata management.

## Technical Implementation

### Database Model (`backend/src/models/file.ts`)

Created a new `File` model extending `BaseDocument` with the following properties:

**Core Properties:**
- `name`: Unique file identifier/name
- `originalName`: Original filename from upload
- `mimeType`: File MIME type (e.g., 'image/jpeg', 'application/pdf')
- `size`: File size in bytes
- `data`: Base64 encoded file content

**Metadata Properties:**
- `uploadedBy`: Optional user ID who uploaded the file
- `description`: Optional file description
- `tags`: Optional array of tags for categorization

**Inherited Properties:**
- `id`: UUID primary key
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

### Custom Model Methods

The `FileModel` class includes specialized methods for file management:

**Search & Retrieval:**
- `findByName()`: Find file by unique name
- `findByOriginalName()`: Find files by original filename
- `findByMimeType()`: Filter files by MIME type
- `findByUploader()`: Get files uploaded by specific user
- `findByTag()`: Find files with specific tag
- `findBySize()`: Filter files by size range
- `searchByName()`: Pattern-based name search
- `searchByOriginalName()`: Pattern-based original name search

**Analytics:**
- `getSizeStats()`: Get file storage statistics (total files, total size, averages, min/max)
- `getRecent()`: Get recently uploaded files
- `findWithSearch()`: Advanced search with pagination and multiple filters

### API Definitions (`backend/src/api/definitions/file.ts`)

Comprehensive API contract definitions using Zod schemas:

**Request Schemas:**
- `CreateFileRequestSchema`: Validation for file creation
- `UpdateFileRequestSchema`: Validation for file updates (metadata only)

**Response Schemas:**
- `FileResponseSchema`: Complete file data structure
- `PaginatedFilesResponseSchema`: Paginated file listings
- `FileStatsResponseSchema`: File storage statistics
- `FileSelectListSchema`: Dropdown/select list format

**Query Schemas:**
- `FileListQuerySchema`: Advanced filtering and pagination
- `FileSizeFilterQuerySchema`: Size-based filtering
- `FileRecentQuerySchema`: Recent files query

### API Endpoints

Full REST API implementation with the following endpoints:

**Core CRUD:**
- `GET /api/v1/files/` - List files with pagination and filtering
- `POST /api/v1/files/` - Create new file
- `GET /api/v1/files/:id` - Get file by ID
- `PUT /api/v1/files/:id` - Update file metadata
- `DELETE /api/v1/files/:id` - Delete file

**Search & Filter:**
- `GET /api/v1/files/search/:pattern` - Search files by name pattern
- `GET /api/v1/files/recent` - Get recent files
- `GET /api/v1/files/mime-type/:mimeType` - Filter by MIME type
- `GET /api/v1/files/tag/:tag` - Filter by tag
- `GET /api/v1/files/uploader/:uploadedBy` - Filter by uploader
- `GET /api/v1/files/size` - Filter by size range

**Utility:**
- `GET /api/v1/files/select-list` - Get files for dropdown lists
- `GET /api/v1/files/stats` - Get storage statistics

### API Handlers (`backend/src/api/handlers/file.ts`)

Implemented complete request handlers with:

**Error Handling:**
- Validation error responses with detailed messages
- Proper HTTP status codes (200, 201, 400, 404, 500)
- Comprehensive error logging

**Data Processing:**
- Response formatting for consistent API output
- Input validation and sanitization
- Conflict detection (duplicate names)

**Security:**
- Authentication middleware integration
- Request logging and timing
- Input validation against schemas

## Architecture Decisions

### Base64 Storage Strategy

**Rationale:** Chose base64 encoding for file data storage to:
- Maintain database-centric architecture consistency
- Simplify backup and replication (single database)
- Enable easy JSON serialization for API responses
- Avoid filesystem dependencies and permissions issues

**Trade-offs:**
- ~33% storage overhead from base64 encoding
- Memory usage for large files during processing
- Not optimal for very large files (>10MB)

### Metadata-Rich Design

Implemented comprehensive metadata to support:
- File organization through tags and descriptions
- User tracking and permissions
- Search and filtering capabilities
- Analytics and reporting

### Type Safety

Full TypeScript integration:
- Zod schema validation for runtime type checking
- TypeScript interfaces for compile-time safety
- Consistent type definitions across backend and frontend
- Self-contained API definitions following project architecture

## Integration Points

### Model Registry
- Added to `backend/src/models/index.ts` for automatic registration
- Follows existing model export patterns

### API Definitions Architecture
- Self-contained definitions in `backend/src/api/definitions/file.ts`
- Symlinked to `ui/src/services/definitions/file.ts` for frontend access
- Follows established ts-typed-api patterns

### Database Integration
- Extends base model for automatic table creation
- Uses JSON storage for flexible metadata
- Leverages existing database manager and migration system

## Usage Examples

### Creating a File
```typescript
const fileData = {
  name: 'user-avatar-123',
  originalName: 'profile.jpg',
  mimeType: 'image/jpeg',
  size: 45678,
  data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
  uploadedBy: 'user-uuid-123',
  description: 'User profile avatar',
  tags: ['avatar', 'profile', 'user-content']
};

const newFile = await fileModel.create(fileData);
```

### Searching Files
```typescript
// Search by pattern
const searchResults = await fileModel.searchByName('avatar');

// Filter by MIME type
const images = await fileModel.findByMimeType('image/jpeg');

// Get user's files
const userFiles = await fileModel.findByUploader('user-uuid-123');

// Size-based filtering
const largeFiles = await fileModel.findBySize(1000000); // > 1MB
```

### Getting Statistics
```typescript
const stats = await fileModel.getSizeStats();
// Returns: { totalFiles, totalSize, averageSize, maxSize, minSize }
```

## Future Enhancements

**Potential Improvements:**
1. **File Versioning:** Track file versions and changes
2. **Compression:** Implement automatic compression for large files
3. **Thumbnails:** Generate thumbnails for image files
4. **Access Control:** File-level permissions and sharing
5. **Storage Optimization:** Hybrid storage (database + filesystem)
6. **Virus Scanning:** Integration with antivirus services
7. **CDN Integration:** External storage for large files

**Performance Optimizations:**
1. **Lazy Loading:** Load file data separately from metadata
2. **Caching:** Redis cache for frequently accessed files
3. **Streaming:** Support for streaming large file uploads/downloads
4. **Batch Operations:** Bulk file operations for efficiency

## Testing Considerations

**Unit Tests Needed:**
- Model CRUD operations
- Search and filtering methods
- Statistics calculations
- Error handling scenarios

**Integration Tests:**
- API endpoint functionality
- File upload/download workflows
- Authentication and authorization
- Performance with various file sizes

**Edge Cases:**
- Very large files (>50MB)
- Invalid base64 data
- Duplicate file names
- Concurrent uploads
- Storage limits
