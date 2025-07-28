25-07-22_21-01

# JSON Parser Implementation

## Overview
Implemented a JSON parser for the file import system that processes files containing lines of JSON objects (JSON Lines format). This extends the existing file import functionality to support JSON, JSONL, and NDJSON file formats.

## Technical Implementation

### JsonParser Class
- **Location**: `ui/src/services/file-import/parsers/JsonParser.ts`
- **Extends**: `BaseParser` abstract class
- **Supported Extensions**: `.json`, `.jsonl`, `.ndjson`

### Key Features

#### File Format Support
- **JSON Lines**: Each line contains a separate JSON object
- **JSONL**: JSON Lines format (`.jsonl` extension)
- **NDJSON**: Newline Delimited JSON (`.ndjson` extension)
- **Standard JSON**: Regular `.json` files with line-separated objects

#### Parsing Logic
- Splits file content by newlines
- Filters out empty lines
- Parses each line as a separate JSON object
- Handles parsing errors gracefully with detailed error reporting
- Continues processing valid lines even if some lines fail

#### Error Handling
- **File Size Validation**: 10MB limit for JSON files
- **Empty File Detection**: Validates file contains content
- **Line-by-Line Error Reporting**: Shows specific line numbers for parsing failures
- **Partial Success Support**: Returns successfully parsed items even if some lines fail
- **Comprehensive Error Messages**: Detailed error information for debugging

#### Name Generation Strategy
The parser intelligently generates names for test data items using the following priority:
1. **Common Identifier Fields**: `name`, `title`, `id`, `identifier`, `key`, `label`, `prompt`, `question`, `input`
2. **Case-Insensitive Matching**: Checks lowercase and uppercase variants
3. **First String Value**: Uses the first non-empty string value from the JSON object
4. **String Truncation**: Limits names to 50 characters with ellipsis
5. **Primitive String Handling**: Supports JSON lines that are just strings
6. **Fallback**: Uses "JSON Line {number}" if no meaningful name is found

### Integration

#### FileImportService Registration
- Added import for `JsonParser` in `FileImportService.ts`
- Registered in `registerDefaultParsers()` method alongside existing parsers
- Automatically included in supported file types and parser display names

#### Type Safety
- Uses `CreateTestDataItemRequest` type from API definitions
- Maintains full TypeScript type safety throughout parsing process
- Leverages existing error handling patterns from base parser

## Usage Examples

### Sample JSON Lines File
```json
{"name": "Test Case 1", "input": "Hello world", "expected": "greeting"}
{"name": "Test Case 2", "input": "Goodbye", "expected": "farewell"}
{"title": "Complex Test", "data": {"nested": "value"}, "type": "complex"}
```

### Generated Test Data Items
Each line becomes a separate test data item with:
- **Name**: Extracted from identifier fields or generated automatically
- **Content**: Pretty-printed JSON (2-space indentation)

## Error Scenarios Handled

1. **Empty Files**: Clear error message for empty files
2. **Invalid JSON**: Line-specific error reporting with line numbers
3. **Mixed Valid/Invalid**: Processes valid lines, logs warnings for invalid ones
4. **Large Files**: File size validation with configurable limits
5. **No Valid Data**: Comprehensive error when no lines can be parsed

## Benefits

- **Flexible Format Support**: Handles multiple JSON line formats
- **Robust Error Handling**: Graceful degradation with detailed error reporting
- **Intelligent Naming**: Automatic generation of meaningful test data item names
- **Type Safety**: Full TypeScript integration with existing API definitions
- **Extensible**: Follows established parser patterns for easy maintenance

## Future Enhancements

- Support for nested JSON arrays (multiple objects per line)
- Custom field mapping configuration
- Validation against JSON schemas
- Preview functionality for large files
- Streaming support for very large files
