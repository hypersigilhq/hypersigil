25-07-21_15-32

# API Access System

## Overview
Implemented a comprehensive API access system that allows users to create and manage API keys for programmatic access to the application. The system provides secure authentication and authorization for API endpoints using API keys with scoped permissions.

## Architecture

### Backend Components

#### 1. API Key Model (`backend/src/models/api-key.ts`)
- **ApiKeyDocument Interface**: Defines the structure for API key documents
  - `name`: Human-readable name for the API key
  - `key_hash`: Bcrypt-hashed version of the API key for security
  - `key_prefix`: First 16 characters of the key for identification in UI
  - `user_id`: Owner of the API key
  - `permissions.scopes`: Array of permission scopes (currently supports `executions:run`)
  - `status`: Either `active` or `revoked`
  - `usage_stats`: Tracks total requests, last used timestamp, and last IP address

- **ApiKeyModel Class**: Provides methods for:
  - Creating new API keys with automatic key generation and hashing
  - Finding API keys by actual key value (with bcrypt verification)
  - Managing API key lifecycle (create, update, revoke)
  - Recording usage statistics
  - Checking scoped permissions

#### 2. API Definitions (`backend/src/api/definitions/api-key.ts`)
- **Self-contained API contracts** following the project's architecture rules
- **CRUD Operations**: List, create, get, update, revoke, and stats endpoints
- **Type-safe schemas** using Zod for request/response validation
- **PublicApiKeySchema**: Excludes sensitive data like `user_id` for client responses

#### 3. API Handlers (`backend/src/api/handlers/api-key.ts`)
- **Authentication Required**: All endpoints require user authentication
- **User Isolation**: Users can only manage their own API keys
- **Proper Error Handling**: Consistent error responses with appropriate HTTP status codes
- **Usage Tracking**: Automatic recording of API key usage statistics

#### 4. API Key Middleware (`backend/src/app.ts`)
- **`apiKeyMiddleware(requiredScope)`**: Factory function for scope-based API key authentication
- **Security Features**:
  - Validates API keys from `X-API-Key` header
  - Checks key status (active/revoked)
  - Verifies required scopes
  - Validates associated user account status
  - Records usage statistics with IP tracking
- **`requireExecutionScope`**: Pre-configured middleware for `executions:run` scope

### Frontend Components

#### 1. API Keys Table (`ui/src/components/settings/ApiKeysTable.vue`)
- **Comprehensive Management Interface**:
  - Displays API key name, prefix, scopes, status, usage statistics
  - Shows creation date and last used timestamp
  - Provides edit and revoke actions via dropdown menu
- **Real-time Data**: Loads and refreshes API key data from backend
- **User Experience**: Loading states, empty states, and error handling

#### 2. Create API Key Dialog (`ui/src/components/settings/CreateApiKeyDialog.vue`)
- **Two-step Process**:
  - Form for entering name and selecting scopes
  - Success dialog showing the generated API key (one-time display)
- **Security Features**:
  - Copy-to-clipboard functionality for the generated key
  - Clear warning that the key won't be shown again
  - Automatic form reset after creation

#### 3. Edit API Key Dialog (`ui/src/components/settings/EditApiKeyDialog.vue`)
- **Limited Editing**: Currently supports updating the API key name only
- **Future Extensibility**: Architecture supports adding scope management

#### 4. Settings Integration
- **New Tab**: Added "API Keys" tab to the Settings view
- **Consistent UI**: Follows existing design patterns and component structure

### API Client Integration

#### 1. Enhanced API Client (`ui/src/services/api-client.ts`)
- **New API Client**: `apiKeyApiClient` for API key management endpoints
- **Helper Functions**: `apiKeysApi` object with methods for all CRUD operations
- **Token Management**: API key client included in authentication token management

## Security Features

### 1. Key Generation and Storage
- **Secure Generation**: Uses Node.js `crypto.randomBytes()` for key generation
- **Format**: `pk_live_` prefix followed by 64 hex characters
- **Hashing**: Keys are hashed using bcrypt before storage (never stored in plain text)
- **Identification**: Only first 16 characters stored as prefix for UI display

### 2. Authentication Flow
- **Header-based**: API keys passed via `X-API-Key` header
- **Validation Chain**:
  1. Extract API key from header
  2. Find and verify key against stored hash
  3. Check key status (active/revoked)
  4. Verify required scopes
  5. Validate associated user account
  6. Record usage statistics

### 3. Permission System
- **Scoped Access**: API keys have specific permission scopes
- **Current Scope**: `executions:run` for prompt execution access
- **Extensible**: Architecture supports adding more scopes as needed
- **User-based**: API keys inherit base permissions from user roles

## Usage Statistics and Monitoring

### 1. Tracking Features
- **Request Counting**: Total number of API requests per key
- **Last Activity**: Timestamp of most recent API key usage
- **IP Logging**: Records the IP address of the last request
- **User Dashboard**: Statistics displayed in the API keys management interface

### 2. Administrative Features
- **User-level Stats**: Aggregate statistics across all user's API keys
- **Usage Monitoring**: Helps users track API key activity
- **Security Monitoring**: IP tracking for security auditing

## Integration Points

### 1. Existing Authentication System
- **Dual Authentication**: API keys work alongside existing JWT token authentication
- **User Context**: API key requests populate the same `req.user` object
- **Role Integration**: API key permissions respect user role restrictions

### 2. Execution System Integration
- **Middleware Application**: `requireExecutionScope` middleware can be applied to execution endpoints
- **Seamless Access**: API key authenticated requests work identically to token-authenticated requests
- **Usage Tracking**: Execution requests via API keys are tracked in usage statistics

## Future Enhancements

### 1. Additional Scopes
- **Planned Scopes**: `prompts:read`, `prompts:write`, `test-data:read`, `test-data:write`
- **Admin Scopes**: `users:read`, `users:write` for administrative access
- **Fine-grained Permissions**: More specific permission controls

### 2. Advanced Features
- **Rate Limiting**: Per-key request rate limits
- **Expiration**: Optional API key expiration dates
- **Webhooks**: API key event notifications
- **Organization Keys**: Team-level API keys

### 3. Security Enhancements
- **Key Rotation**: Automatic or manual key rotation
- **IP Restrictions**: Limit API key usage to specific IP addresses
- **Audit Logging**: Comprehensive API key usage audit trail

## Technical Implementation Notes

### 1. Database Schema
- **JSON Storage**: API key data stored as JSON in SQLite with proper indexing
- **Automatic Timestamps**: Created/updated timestamps managed by base model
- **Efficient Queries**: Optimized queries for key lookup and user-based filtering

### 2. Type Safety
- **End-to-end Types**: TypeScript types shared between backend and frontend
- **Zod Validation**: Runtime validation of all API requests and responses
- **Interface Consistency**: Consistent data structures across all layers

### 3. Error Handling
- **Standardized Responses**: Consistent error response format
- **Appropriate Status Codes**: HTTP status codes match error conditions
- **User-friendly Messages**: Clear error messages for UI display

This API access system provides a secure, scalable foundation for programmatic access to the application while maintaining the existing security model and user experience standards.
