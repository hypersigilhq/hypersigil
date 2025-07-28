25-07-25_15-14

# Settings API Handlers

## Overview

Comprehensive CRUD API handlers for the settings system that supports multiple types of settings with type safety and proper validation. The system handles both LLM API key settings and token limit settings with extensible architecture for future setting types.

## Architecture

### API Definitions (`backend/src/api/definitions/settings.ts`)

- **Type-safe schemas** using Zod for all setting types
- **Discriminated union types** for handling multiple setting types
- **Self-contained definitions** following the API definitions architecture rules
- **Comprehensive request/response schemas** for all CRUD operations

### Handlers (`backend/src/api/handlers/settings.ts`)

- **Full CRUD operations** for all setting types
- **Type-safe request/response handling** using ts-typed-api
- **Proper error handling** with try/catch blocks
- **Conflict detection** for duplicate settings
- **Authentication middleware** integration

## Supported Setting Types

### 1. LLM API Key Settings (`llm-api-key`)
- **Provider-specific API keys** for AI providers (OpenAI, Anthropic, Ollama)
- **Unique identifier**: Provider name
- **Fields**: `provider`, `api_key`
- **Conflict prevention**: One API key per provider

### 2. Token Limit Settings (`token-limit`)
- **Model-specific token limits** for controlling execution costs
- **Unique identifier**: `provider:model` format
- **Fields**: `provider`, `model`, `limit`
- **Conflict prevention**: One limit per provider-model combination

## API Endpoints

### Core CRUD Operations

1. **List All Settings**
   - `GET /api/v1/settings/`
   - Returns all settings ordered by creation date

2. **Create Setting**
   - `POST /api/v1/settings/`
   - Body: `{ type, data }` with discriminated union validation
   - Prevents duplicate settings with 409 Conflict response

3. **Get Setting by ID**
   - `GET /api/v1/settings/:id`
   - Returns specific setting or 404 if not found

4. **Update Setting**
   - `PUT /api/v1/settings/:id`
   - Body: `{ type, data }` with type validation
   - Verifies type matches existing setting

5. **Delete Setting**
   - `DELETE /api/v1/settings/:id`
   - Returns success status or 404 if not found

### Type-Specific Operations

6. **List Settings by Type**
   - `GET /api/v1/settings/type/:type`
   - Returns all settings of specified type

7. **Get by Type and Identifier**
   - `GET /api/v1/settings/type/:type/identifier/:identifier`
   - Direct access using type and identifier

8. **Delete by Type and Identifier**
   - `DELETE /api/v1/settings/type/:type/identifier/:identifier`
   - Bulk deletion with count returned

## Key Features

### Type Safety
- **Zod schema validation** for all requests and responses
- **TypeScript discriminated unions** for handling multiple setting types
- **Proper type casting** in handlers to maintain type safety

### Error Handling
- **Comprehensive try/catch blocks** for all operations
- **Proper HTTP status codes** (200, 201, 400, 401, 404, 409, 500)
- **Detailed error messages** for debugging and user feedback

### Conflict Prevention
- **Duplicate detection** before creating settings
- **Unique identifier validation** for multiple-type settings
- **409 Conflict responses** with descriptive messages

### Data Formatting
- **Consistent response formatting** with helper functions
- **ISO string dates** for created_at and updated_at fields
- **Clean separation** between model and API response types

## Security

- **Authentication required** for all endpoints via authMiddleware
- **Request logging** and timing middleware for monitoring
- **Input validation** through Zod schemas
- **SQL injection protection** through parameterized queries

## Usage Examples

### Creating an LLM API Key Setting
```typescript
POST /api/v1/settings/
{
  "type": "llm-api-key",
  "data": {
    "provider": "openai",
    "api_key": "sk-..."
  }
}
```

### Creating a Token Limit Setting
```typescript
POST /api/v1/settings/
{
  "type": "token-limit",
  "data": {
    "provider": "openai",
    "model": "gpt-4",
    "limit": 4000
  }
}
```

### Updating a Setting
```typescript
PUT /api/v1/settings/:id
{
  "type": "llm-api-key",
  "data": {
    "api_key": "sk-new-key..."
  }
}
```

## Integration Points

- **Settings Model**: Uses the comprehensive settings model with type-safe methods
- **AI Providers**: Integrates with provider system for API key validation
- **Execution System**: Token limits used for controlling execution costs
- **Frontend**: Provides data for settings management UI

## Future Extensibility

The architecture supports easy addition of new setting types:

1. **Add new type** to `SettingsMultipleTypeMap` or `SettingsSingleTypeMap`
2. **Define document interface** extending `SettingsDocument`
3. **Add Zod schemas** for validation
4. **Update discriminated unions** in API definitions
5. **Handlers automatically support** new types through generic implementation

## Technical Implementation

- **Self-contained API definitions** following architecture rules
- **No internal imports** in definition files
- **Proper middleware chain** with logging, timing, and authentication
- **Consistent error handling** patterns across all endpoints
- **Type-safe model integration** with proper casting where needed
