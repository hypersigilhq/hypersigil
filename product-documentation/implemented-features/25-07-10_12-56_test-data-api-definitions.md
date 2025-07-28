25-07-10_12-56

# Test Data API Definitions

## Overview
Implemented comprehensive API definitions for test data groups and test data items to enable batch testing functionality. This feature allows users to create collections of test data and execute prompts against all items in a group simultaneously, significantly speeding up the testing process.

## Architecture

### API Structure
- **Test Data Groups**: Containers that hold multiple test data items
- **Test Data Items**: Individual test cases with content for prompt execution
- **Batch Executions**: Ability to create multiple executions from a test data group

### Key Components

#### Test Data Group
- `id`: Unique identifier (UUID)
- `name`: Human-readable name (1-255 characters)
- `description`: Optional description
- `created_at`/`updated_at`: Timestamps

#### Test Data Item
- `id`: Unique identifier (UUID)
- `group_id`: Foreign key to test data group
- `name`: Optional name for the item
- `content`: The actual test content (required, minimum 1 character)
- `created_at`/`updated_at`: Timestamps

## API Endpoints

### Test Data Groups
- `GET /api/v1/test-data/groups` - List groups with pagination and search
- `POST /api/v1/test-data/groups` - Create new group
- `GET /api/v1/test-data/groups/:id` - Get specific group
- `PUT /api/v1/test-data/groups/:id` - Update group
- `DELETE /api/v1/test-data/groups/:id` - Delete group (cascades to items)

### Test Data Items
- `GET /api/v1/test-data/groups/:groupId/items` - List items in a group
- `POST /api/v1/test-data/groups/:groupId/items` - Add item to group
- `POST /api/v1/test-data/groups/:groupId/items/bulk` - Bulk upload items (max 100)
- `GET /api/v1/test-data/items/:id` - Get specific item
- `PUT /api/v1/test-data/items/:id` - Update item
- `DELETE /api/v1/test-data/items/:id` - Delete item

### Batch Executions
- `POST /api/v1/test-data/executions/batch` - Create batch executions from test data group

## Features

### Pagination and Search
- All list endpoints support pagination with configurable page size
- Search functionality for both groups and items
- Sorting by name, created_at, or updated_at with ASC/DESC ordering

### Bulk Operations
- Bulk item creation with error handling for individual failures
- Batch execution creation that processes all items in a group
- Comprehensive error reporting for failed operations

### Type Safety
- Full TypeScript type definitions using Zod schemas
- Self-contained API definitions following project architecture
- Proper validation for all request/response data

### Integration with Existing Systems
- Seamless integration with existing execution system
- Maintains all execution features (status tracking, results, etc.)
- Uses existing provider/model selection and execution options

## Technical Implementation

### Schema Validation
- Zod schemas for all request/response types
- UUID validation for all ID fields
- String length validation and content requirements
- Optional field handling with proper defaults

### Error Handling
- Consistent error response format
- Detailed validation error messages
- Proper HTTP status codes (200, 201, 400, 404, 500)
- Bulk operation error reporting with item-level details

### API Definition Architecture
- Self-contained definitions in `backend/src/api/definitions/test-data.ts`
- Symlinked to UI definitions for type sharing
- Follows established patterns from existing prompt and execution APIs
- Uses ts-typed-api package for type-safe API definitions

## Usage Workflow

1. **Create Test Data Group**: User creates a named group for organizing test cases
2. **Add Test Items**: User adds individual test items with content to the group
3. **Bulk Upload**: Optionally, user can bulk upload multiple items at once
4. **Execute Batch**: User selects a prompt and test data group to create multiple executions
5. **Monitor Results**: Each item creates a separate execution that can be monitored individually

## Benefits

- **Faster Testing**: Execute prompts against multiple test cases simultaneously
- **Organization**: Group related test cases together for better management
- **Scalability**: Support for bulk operations and large test datasets
- **Flexibility**: Individual item management alongside bulk operations
- **Integration**: Seamless integration with existing execution and monitoring systems
