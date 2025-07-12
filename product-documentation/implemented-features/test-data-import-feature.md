# Test Data Import Feature

## Overview
Implemented an extensible file import system for the Test Data Items interface that allows users to import multiple files (.md format initially) and automatically create test data items from their content. The architecture is designed to be easily extensible for future file formats.

## Architecture

### Core Components

#### 1. File Import Service Layer (`ui/src/services/file-import/`)
- **`types.ts`** - TypeScript interfaces for import operations
- **`FileImportService.ts`** - Main orchestration service with plugin architecture
- **`parsers/BaseParser.ts`** - Abstract base class for all file parsers
- **`parsers/MarkdownParser.ts`** - Markdown file parser implementation

#### 2. UI Components
- **`ImportItemsDialog.vue`** - Modal dialog for file selection and import progress
- **Updated `TestDataItemsTable.vue`** - Added Import button and dialog integration

#### 3. API Integration
- **Updated `api-client.ts`** - Added `bulkCreateItems` method for efficient batch creation

### Key Features

#### Extensible Parser Architecture
- Plugin-based system using abstract `FileParser` interface
- Easy registration of new parsers for different file formats
- Automatic file type detection and parser selection

#### Markdown Parser Implementation
- Supports `.md` and `.markdown` file extensions
- Uses filename (without extension) as item name
- Processes full file content as item content
- 5MB file size limit with validation
- UTF-8 encoding support

#### User Experience
- **File Selection**: HTML5 file input with format filtering
- **Real-time Progress**: Live status updates during processing
- **Batch Processing**: Sequential file processing with progress tracking
- **Error Handling**: Individual file error reporting with detailed messages
- **Success Summary**: Statistics showing successful/failed imports and items created

#### Import Dialog Features
- File preview with size information
- Progress bar and status indicators
- Results table with per-file status
- Color-coded status indicators (pending, processing, success, error)
- Summary statistics upon completion

### Technical Implementation

#### File Processing Flow
1. User selects multiple files through file input
2. FileImportService validates and processes files sequentially
3. Each file is parsed by appropriate parser (MarkdownParser for .md files)
4. Parsed items are collected into bulk request
5. Bulk API call creates all items efficiently
6. UI updates with results and refreshes item list

#### Type Safety
- Full TypeScript integration with existing API definitions
- Leverages `BulkCreateTestDataItemsRequest` and `BulkCreateTestDataItemsResponse` types
- Proper error handling with typed responses

#### Performance Considerations
- Client-side processing (no server uploads)
- Sequential file processing to avoid overwhelming the system
- Efficient bulk API calls instead of individual item creation
- File size validation to prevent memory issues

### Future Extensibility

#### Planned Parser Extensions
- **JSON Parser**: Parse arrays of objects, each becoming a test data item
- **CSV Parser**: Process rows with configurable column mapping
- **Custom Formats**: Easy addition through FileParser interface

#### Extension Points
```typescript
// Example future JSON parser
class JsonParser extends BaseParser {
  canHandle(file: File): boolean {
    return file.name.toLowerCase().endsWith('.json')
  }
  
  async parse(file: File): Promise<CreateTestDataItemRequest[]> {
    // Parse JSON array and create items
  }
}

// Register new parser
fileImportService.registerParser(new JsonParser())
```

### UI/UX Design

#### Design Consistency
- Follows existing design patterns from PromptsTable.vue
- Uses shadcn/ui components for consistency
- Maintains spacing, typography, and color scheme

#### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Clear visual feedback for all states

#### Error Handling
- Client-side validation with real-time feedback
- Detailed error messages for failed imports
- Graceful handling of partial failures
- Retry capabilities where appropriate

### Integration Points

#### TestDataItemsTable Integration
- Added Import button next to Create Item button
- Seamless dialog integration with existing patterns
- Automatic table refresh after successful imports
- Consistent success handling with other operations

#### API Integration
- Uses existing `testDataApi.groups.bulkCreateItems` endpoint
- Proper error handling with existing error patterns
- Maintains consistency with other API operations

## Benefits

### User Experience
- **Efficiency**: Bulk import instead of manual item creation
- **Flexibility**: Support for multiple file formats
- **Transparency**: Clear progress and status feedback
- **Reliability**: Robust error handling and validation

### Developer Experience
- **Maintainability**: Clean separation of concerns
- **Extensibility**: Easy addition of new file formats
- **Type Safety**: Full TypeScript integration
- **Testability**: Modular architecture supports unit testing

### System Performance
- **Client-side Processing**: Reduces server load
- **Batch Operations**: Efficient database operations
- **Memory Management**: File size limits and streaming where needed
- **Error Isolation**: Individual file failures don't affect others

## Usage

1. Navigate to Test Data Items view for any group
2. Click the "Import" button next to "Create Item"
3. Select one or more .md files using the file picker
4. Review selected files and click "Import"
5. Monitor real-time progress and status
6. Review results summary and close dialog
7. Imported items appear in the table automatically

This implementation provides a solid foundation for file-based test data import while maintaining the flexibility to support additional formats and use cases in the future.
