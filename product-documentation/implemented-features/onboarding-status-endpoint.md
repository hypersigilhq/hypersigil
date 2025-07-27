# Onboarding Status Endpoint

## Overview
Added a new API endpoint to check the onboarding status of the application by determining if essential data exists in the system.

## Implementation Details

### API Definition
- **Endpoint**: `GET /api/v1/common/onboarding-status`
- **Location**: `backend/src/api/definitions/common.ts`
- **Response Schema**: `OnboardingStatusSchema`

### Response Structure
```typescript
{
  promptAvailable: boolean,      // True if at least one prompt exists
  llmApiKeyAvailable: boolean    // True if at least one LLM API key setting exists
}
```

### Handler Implementation
- **Location**: `backend/src/api/handlers/common.ts`
- **Service**: Uses `onboardingService.getOnboardingStatus()`
- **Error Handling**: Returns 500 status with error message on failure

### Service Integration
- Leverages existing `onboarding-service.ts` which checks:
  - Prompt availability via `promptModel.count({})`
  - LLM API key availability via `settingsModel.count({ type: 'llm-api-key' })`

### Architecture Compliance
- Follows the established API definitions architecture
- Uses ts-typed-api package for type safety
- Implements proper error handling with Result pattern
- Self-contained definitions without internal module imports

## Usage
This endpoint can be used by the frontend to determine the application's setup status and guide users through the onboarding process by checking if essential components (prompts and API keys) are configured.

## Files Modified
- `backend/src/api/definitions/common.ts` - Added OnboardingStatusSchema and CommonApiDefinition
- `backend/src/api/handlers/common.ts` - Created new handler file
- `backend/src/index.ts` - Added import for common handler
