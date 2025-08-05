# Webhook Column in Deployments Table

**Date:** 05-08-25 00:41  
**Feature:** Add webhook column to DeploymentsTable.vue showing webhook destination names by ID

## Overview

Enhanced the DeploymentsTable.vue component to display webhook destination information in a dedicated column, showing webhook names instead of raw IDs for better user experience.

## Implementation Details

### Frontend Changes

#### DeploymentsTable.vue Updates
- **Added webhook column** to the table header between "Options" and "Created" columns
- **Implemented webhook names cache** (`webhookNames` ref) to store ID-to-name mappings
- **Added loadWebhookNames function** to fetch webhook destinations from settings API
- **Enhanced table cell rendering** to display webhook destination names as badges
- **Updated colspan** for empty state from 8 to 10 to accommodate new column

### Key Features

#### Webhook Display Logic
- Shows webhook destination names as secondary badges when webhooks are configured
- Displays "None" when no webhooks are assigned to a deployment
- Falls back to webhook ID if name cannot be resolved
- Supports multiple webhook destinations per deployment

#### Data Loading
- Fetches webhook destinations using `settingsApi.listByType('webhook-destination')`
- Creates ID-to-name mapping for efficient lookup
- Loads webhook names alongside prompt names when deployments are loaded
- Handles errors gracefully with console logging

#### UI/UX Improvements
- Uses secondary variant badges for webhook names
- Compact text size (text-xs) for space efficiency
- Proper spacing between multiple webhook badges
- Consistent styling with existing table design

## Technical Implementation

### API Integration
```typescript
// Load webhook destination names for display
const loadWebhookNames = async () => {
    try {
        const webhookResponse = await settingsApi.listByType('webhook-destination')

        const names: Record<string, string> = {}
        webhookResponse.settings.forEach(setting => {
            if (setting.type === 'webhook-destination') {
                const webhookSetting = setting as WebhookDestinationSettings
                names[webhookSetting.id] = webhookSetting.name
            }
        })
        webhookNames.value = names
    } catch (err) {
        console.error('Failed to load webhook destination names:', err)
    }
}
```

### Template Structure
```vue
<TableCell>
    <div v-if="deployment.webhookDestinationIds && deployment.webhookDestinationIds.length > 0"
        class="space-y-1">
        <div v-for="webhookId in deployment.webhookDestinationIds" :key="webhookId"
            class="text-sm">
            <Badge variant="secondary" class="text-xs">
                {{ webhookNames[webhookId] || webhookId }}
            </Badge>
        </div>
    </div>
    <span v-else class="text-muted-foreground text-sm">None</span>
</TableCell>
```

## Benefits

### User Experience
- **Clear webhook visibility** - Users can immediately see which webhook destinations are configured
- **Human-readable names** - Shows meaningful webhook names instead of cryptic IDs
- **Multiple webhook support** - Properly displays all configured webhook destinations
- **Consistent design** - Follows existing table patterns and styling

### Maintainability
- **Type-safe implementation** - Uses proper TypeScript types from API definitions
- **Error handling** - Graceful fallbacks when webhook names cannot be loaded
- **Efficient caching** - Loads webhook names once and reuses across all deployments
- **Clean separation** - Webhook loading logic is separate from deployment loading

## Integration Points

### Settings API
- Leverages existing `settingsApi.listByType('webhook-destination')` endpoint
- Uses `WebhookDestinationSettings` type for type safety
- Integrates with webhook destinations management system

### Deployment Model
- Utilizes `webhookDestinationIds` property from deployment responses
- Supports optional webhook configuration (graceful handling of undefined/empty arrays)
- Maintains compatibility with existing deployment data structure

## Future Enhancements

### Potential Improvements
- **Webhook status indicators** - Show active/inactive status for each webhook
- **Webhook configuration preview** - Hover tooltips with webhook URL information
- **Inline webhook management** - Quick add/remove webhook actions from table
- **Webhook execution history** - Link to webhook delivery logs and status

This implementation provides a solid foundation for webhook visibility in the deployments interface while maintaining clean architecture and user experience standards.
