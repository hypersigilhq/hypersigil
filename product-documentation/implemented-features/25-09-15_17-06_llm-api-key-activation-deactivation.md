# LLM API Key Activation/Deactivation Feature

## Overview
Implemented the ability to activate and deactivate LLM API keys through both backend and frontend interfaces. This feature allows users to temporarily disable API keys without deleting them, providing better control over which keys are used in executions.

## Backend Changes

### Model Updates
- **File**: `backend/src/models/settings.ts`
- **Change**: Added `active: boolean` field to `LlmApiKeySettingsDocument` interface
- **Default**: New API keys default to `active: true`

### API Definitions
- **File**: `backend/src/api/definitions/settings.ts`
- **Changes**:
  - Added `active: z.boolean()` to `LlmApiKeySettingsSchema`
  - Updated `CreateLlmApiKeySettingsRequestSchema` with `active: z.boolean().default(true)`
  - Updated `UpdateLlmApiKeySettingsRequestSchema` to allow `active` field updates

### API Handlers
- **File**: `backend/src/api/handlers/settings.ts`
- **Changes**:
  - Updated `formatSettingsDocument` to include `active` field in API responses
  - Modified create handler to set `active: data.active ?? true` for new LLM API keys

### Provider Registry
- **File**: `backend/src/providers/provider-registry.ts`
- **Changes**:
  - Modified `initializeProviders` to skip inactive API keys during provider initialization
  - Added `addProviderFromSettings()` method for activating providers individually
  - Added `removeProviderByName()` method for deactivating providers individually
  - **Impact**: Only active API keys are loaded into the provider registry for use in executions
  - **Performance**: Toggle operations are atomic and don't rebuild entire registry

## Frontend Changes

### UI Component Updates
- **File**: `ui/src/components/settings/LlmApiKeysTable.vue`
- **Changes**:
  - Added "Active" column to the table header
  - Added Switch component for toggling active state
  - Implemented `toggleApiKeyActive` function with proper error handling
  - Added success/error toast notifications for toggle operations

### Dependencies
- Added `Switch` component import from `@/components/ui/switch`

## User Experience

### Interface
- Clean table layout with Provider, Active toggle, Created date, and Actions columns
- Intuitive toggle switch for activating/deactivating keys
- Visual feedback through toast notifications

### Behavior
- New API keys are created as active by default
- Toggling active state immediately updates the backend
- Provider registry automatically refreshes to reflect active key changes
- Inactive keys are not loaded for executions

## Technical Architecture

### Type Safety
- Full TypeScript support with proper type definitions
- API definitions maintain single source of truth principle
- Symlinked UI definitions stay in sync with backend

### Error Handling
- Comprehensive error handling for toggle operations
- User-friendly error messages via toast notifications
- Graceful fallback behavior

### Performance
- Provider registry filtering prevents unnecessary provider initialization
- Efficient database queries for settings management

## Business Value

### Use Cases
- **Multiple Keys**: Manage production vs staging API keys for same provider
- **Temporary Disable**: Quickly disable keys during maintenance or quota issues
- **Cost Control**: Deactivate expensive keys when not needed
- **Testing**: Enable/disable keys during development and testing

### Benefits
- **Flexibility**: Better control over API key usage without permanent deletion
- **Cost Management**: Prevent unnecessary API calls to deactivated keys
- **Operational Control**: Quick response to API key issues
- **User Experience**: Intuitive interface for key management

## Future Considerations

### Potential Enhancements
- Bulk activation/deactivation of multiple keys
- Scheduled activation/deactivation
- API key usage statistics and analytics
- Integration with monitoring/alerting systems

### Monitoring
- Track activation/deactivation events for audit purposes
- Monitor impact on execution success rates
- Alert on inactive key usage attempts
