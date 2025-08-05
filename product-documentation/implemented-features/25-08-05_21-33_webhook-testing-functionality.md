# Webhook Testing Functionality

**Date:** 05-08-25 21:33  
**Feature:** Webhook Testing in CreateWebhookDestinationDialog

## Overview

Added webhook testing functionality to the CreateWebhookDestinationDialog component, allowing users to test webhook endpoints before saving webhook destinations. This feature integrates with the existing job trigger endpoint to send test webhook deliveries.

## Implementation Details

### Frontend Changes

#### CreateWebhookDestinationDialog.vue
- **Test Button**: Added a test tube icon button next to the webhook URL input field
- **Loading State**: Implemented separate loading state (`testLoading`) for test operations
- **Validation**: Added URL validation before sending test webhooks
- **User Feedback**: Integrated toast notifications for test results

#### API Client Integration
- **jobsApi.trigger**: Added trigger method to jobsApi in api-client.ts
- **Type Safety**: Properly typed webhook-delivery job trigger with URL parameter

### Key Features

1. **Inline Testing**: Test button positioned directly next to the URL input field
2. **Real-time Validation**: URL validation before triggering test webhook
3. **Loading Indicators**: Visual feedback during test execution with spinning loader
4. **Error Handling**: Comprehensive error handling with user-friendly messages
5. **Success Feedback**: Clear confirmation when test webhook is queued

### User Experience

#### Test Button Behavior
- **Enabled**: When URL field contains valid URL and not currently testing
- **Disabled**: When URL is empty, invalid, or test is in progress
- **Visual States**: Test tube icon when idle, spinning loader when testing

#### Feedback Messages
- **Success**: "Test webhook has been queued for delivery. Check your endpoint logs to verify receipt."
- **Validation Error**: "Please enter a valid URL"
- **API Error**: Displays specific error message from API response

### Technical Implementation

#### Component Structure
```typescript
// New reactive references
const testLoading = ref(false)

// Test function with validation and error handling
const testWebhook = async () => {
  // URL validation
  if (!form.value.url.trim()) {
    toast({ title: 'Error', description: 'Please enter a webhook URL first', variant: 'error' })
    return
  }

  try {
    new URL(form.value.url)
  } catch {
    toast({ title: 'Error', description: 'Please enter a valid URL', variant: 'error' })
    return
  }

  testLoading.value = true

  try {
    await jobsApi.trigger({
      job: {
        type: 'webhook-delivery',
        data: { url: form.value.url.trim() }
      }
    })

    toast({
      title: 'Test Webhook Sent',
      description: 'A test webhook has been queued for delivery. Check your endpoint logs to verify receipt.'
    })
  } catch (error: any) {
    toast({
      title: 'Test Failed',
      description: error?.message || 'Failed to send test webhook',
      variant: 'error'
    })
  } finally {
    testLoading.value = false
  }
}
```

#### Template Integration
```vue
<div class="flex space-x-2">
  <Input id="url" v-model="form.url" type="url"
    placeholder="https://your-webhook-endpoint.com/webhook"
    :class="{ 'border-destructive': errors.url }" required />
  <Button type="button" variant="outline" size="sm" @click="testWebhook"
    :disabled="!form.url.trim() || testLoading" class="shrink-0">
    <TestTube v-if="!testLoading" class="h-4 w-4" />
    <Loader2 v-else class="h-4 w-4 animate-spin" />
  </Button>
</div>
```

### Integration Points

#### Job System Integration
- **Endpoint**: Uses existing `/api/v1/jobs/single/trigger` endpoint
- **Job Type**: `webhook-delivery` with URL data parameter
- **Queue Processing**: Leverages existing job processing infrastructure

#### UI Components
- **Icons**: TestTube and Loader2 from lucide-vue-next
- **Button**: shadcn/ui Button component with outline variant
- **Toast**: Global toast service for user notifications

### Benefits

1. **Immediate Feedback**: Users can verify webhook endpoints before saving
2. **Reduced Errors**: Prevents configuration of non-functional webhook URLs
3. **Development Workflow**: Streamlines webhook endpoint development and testing
4. **User Confidence**: Provides assurance that webhook configuration is correct

### Future Enhancements

- **Test Payload Customization**: Allow users to specify custom test payloads
- **Response Validation**: Display webhook endpoint response status
- **Test History**: Track and display previous test results
- **Batch Testing**: Test multiple webhook destinations simultaneously

This implementation enhances the webhook destination management workflow by providing immediate testing capabilities, improving user experience and reducing configuration errors.
