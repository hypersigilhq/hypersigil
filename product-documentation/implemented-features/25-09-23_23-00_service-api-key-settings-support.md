# Service API Key Settings Support

## Overview
Extended the settings API to support "service-api-key" type settings, specifically for VoyageAI provider integration. This follows the same patterns as existing LLM API key settings with encryption and validation.

## Changes Made

### Backend API Definitions (`backend/src/api/definitions/settings.ts`)
- Added `settingsTypeServiceApiKey` constant
- Created `ServiceApiKeySettingsSchema` with VoyageAI provider support
- Added schema to `SettingsDocumentSchema` discriminated union
- Created `CreateServiceApiKeySettingsRequestSchema` and `UpdateServiceApiKeySettingsRequestSchema`
- Updated generic request schemas to include service-api-key support
- Added service-api-key to API endpoint enums for `listByType` and `getByTypeAndIdentifier`

### Backend API Handlers (`backend/src/api/handlers/settings.ts`)
- Added service-api-key case to `formatSettingsDocument` function
- Added conflict checking for service-api-key creation (prevents duplicate providers)
- Added service-api-key case to setting creation with API key encryption
- Follows same encryption pattern as LLM API keys for security

### Frontend UI Definitions (`ui/src/services/definitions/settings.ts`)
- Added `ServiceApiKeySettingsSchema` and type exports
- Updated discriminated union to include service-api-key
- Added request/response schemas for service API keys
- Updated API definition enums to include service-api-key

### Frontend API Client (`ui/src/services/api-client/settings.ts`)
- Updated `listByType` and `getByTypeAndIdentifier` function signatures to include 'service-api-key'

### UI Components
- **ServiceApiKeysTable.vue**: New table component for managing service API keys (similar to LlmApiKeysTable)
- **CreateServiceApiKeyDialog.vue**: New dialog component for adding service API keys
- **SettingsView.vue**: Added ServiceApiKeysTable to the General settings tab

## Technical Details
- **Provider**: Currently supports "voyageai" as the service provider
- **Encryption**: API keys are encrypted using the same `encryptString` utility as LLM keys
- **Validation**: Prevents duplicate service providers, follows existing conflict resolution patterns
- **Type Safety**: Maintains full TypeScript type safety using the definitions system

## API Endpoints
All existing settings endpoints now support service-api-key type:
- `POST /api/v1/settings/` - Create service API key setting
- `GET /api/v1/settings/:id` - Get service API key setting
- `PUT /api/v1/settings/:id` - Update service API key setting
- `DELETE /api/v1/settings/:id` - Delete service API key setting
- `GET /api/v1/settings/type/service-api-key` - List all service API key settings
- `GET /api/v1/settings/type/service-api-key/identifier/:identifier` - Get by provider identifier

## Future Considerations
- Currently limited to VoyageAI, but the architecture supports adding more service providers
- No service provider registry integration yet (unlike LLM providers)
- Could be extended for other embedding/vector services in the future
