# Onboarding Service

## Overview
The onboarding service provides functionality to check the system's onboarding status by determining if essential data exists in the database. This helps determine what setup steps are still needed for new installations.

## Implementation Details

### Service Location
- **File**: `backend/src/services/onboarding-service.ts`
- **Export**: `onboardingService` (singleton instance)

### Core Functionality

#### `getOnboardingStatus()`
Returns the current onboarding status by checking for essential system data.

**Return Type**: `Result<OnboardingStatus, string>`

**OnboardingStatus Interface**:
```typescript
interface OnboardingStatus {
    promptAvailable: boolean;      // true if at least one prompt exists
    llmApiKeyAvailable: boolean;   // true if at least one LLM API key is configured
}
```

### Implementation Logic

1. **Prompt Availability Check**
   - Uses `promptModel.count({})` to check if any prompts exist in the database
   - Returns `true` if count > 0, `false` otherwise

2. **LLM API Key Availability Check**
   - Uses `settingsModel.count({ type: 'llm-api-key' })` to check for LLM API key settings
   - Returns `true` if count > 0, `false` otherwise

### Error Handling
- Uses the global `Result<T, E>` pattern for error handling
- Returns `Err()` with descriptive error message if database operations fail
- Returns `Ok()` with status object on success

### Dependencies
- `promptModel` from `../models/prompt`
- `settingsModel` from `../models/settings`
- Global `Result`, `Ok`, `Err` types

### Usage Example
```typescript
import { onboardingService } from '../services/onboarding-service';

const statusResult = await onboardingService.getOnboardingStatus();
if (statusResult.success) {
    const { promptAvailable, llmApiKeyAvailable } = statusResult.data;
    console.log('Prompts available:', promptAvailable);
    console.log('LLM API keys available:', llmApiKeyAvailable);
} else {
    console.error('Failed to get onboarding status:', statusResult.error);
}
```

## Integration
- Added to `backend/src/services/index.ts` for centralized service exports
- Follows existing service patterns and architecture
- Uses established database models and error handling patterns
