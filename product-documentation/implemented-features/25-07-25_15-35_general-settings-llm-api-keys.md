25-07-25_15-35

# General Settings Tab with LLM API Key Management

## Overview
Implemented a new "General" tab in the Settings view that provides LLM API key management functionality. This allows users to add and remove API keys for different AI providers (OpenAI, Anthropic, Ollama) without the ability to view or update existing keys for security reasons.

## Implementation Details

### Frontend Components

#### 1. Updated SettingsView.vue
- Added a new "General" tab as the default tab in the settings interface
- Updated the tab layout to accommodate three tabs: General, Users, and API Keys
- Integrated the LlmApiKeysTable component into the General tab

#### 2. LlmApiKeysTable.vue
- **Location**: `ui/src/components/settings/LlmApiKeysTable.vue`
- **Features**:
  - Displays a table of existing LLM API keys with provider, masked API key, and creation date
  - "Add API Key" button to create new API keys
  - Delete functionality for removing API keys
  - Loading states and empty state handling
  - Confirmation dialogs for destructive actions
  - Toast notifications for user feedback

#### 3. CreateLlmApiKeyDialog.vue
- **Location**: `ui/src/components/settings/CreateLlmApiKeyDialog.vue`
- **Features**:
  - Modal dialog for adding new LLM API keys
  - Provider selection dropdown (OpenAI, Anthropic, Ollama)
  - Secure password input field for API key
  - Form validation and error handling
  - Integration with settings API

### Backend Integration

#### API Client Updates
- Extended `ui/src/services/api-client.ts` to include settings API client
- Added helper functions for settings operations:
  - `settingsApi.listByType()` - List settings by type
  - `settingsApi.create()` - Create new settings
  - `settingsApi.deleteByTypeAndIdentifier()` - Delete settings by type and identifier

#### API Definitions
- Leveraged existing settings API definitions from `ui/src/services/definitions/settings.ts`
- Used type-safe schemas for LLM API key operations
- Supported providers: OpenAI, Anthropic, Ollama

## User Experience

### Security Features
- API keys are masked in the UI (showing only first 4 and last 4 characters)
- Password input field prevents shoulder surfing
- No ability to view or edit existing API keys (only add/remove)
- Confirmation dialogs for destructive operations

### User Interface
- Consistent design with existing settings components
- Responsive table layout
- Clear visual hierarchy with badges for providers
- Accessible keyboard navigation and screen reader support

### Error Handling
- Comprehensive error handling with user-friendly messages
- Toast notifications for success and error states
- Form validation with real-time feedback
- Loading states during API operations

## Technical Architecture

### Type Safety
- Full TypeScript integration with API definitions
- Proper typing for all components and API calls
- Leveraged existing type definitions from settings API

### State Management
- Vue 3 Composition API for reactive state
- Proper cleanup and reset of form data
- Efficient re-rendering with minimal DOM updates

### API Integration
- RESTful API calls using ts-typed-api client
- Proper error handling and response processing
- Consistent error handling patterns across the application

## Usage Instructions

1. Navigate to Settings → General tab
2. View existing LLM API keys in the table
3. Click "Add API Key" to create a new API key
4. Select the provider (OpenAI, Anthropic, or Ollama)
5. Enter the API key securely
6. Click "Add API Key" to save
7. Use the dropdown menu to delete existing API keys when needed

## Future Enhancements

- API key validation against provider endpoints
- Usage statistics and monitoring
- API key rotation functionality
- Bulk operations for multiple keys
- Integration with key management services
