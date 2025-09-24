# Webhook Support for Deployment Embeddings

## Overview
Added webhook destination support to deployment embeddings, allowing users to configure webhook notifications for embedding generation completions. This feature mirrors the webhook functionality already implemented for regular deployments.

## Backend Changes

### API Definitions (`backend/src/api/definitions/deployment-embedding.ts`)
- Added `webhookDestinationIds: z.array(z.string()).optional()` to `CreateDeploymentEmbeddingRequestSchema`
- Added `webhookDestinationIds: z.array(z.string()).optional()` to `UpdateDeploymentEmbeddingRequestSchema`
- The response schema already included `webhookDestinationIds` field

### API Handlers (`backend/src/api/handlers/deployment-embedding.ts`)
- Updated `create` handler to extract and store `webhookDestinationIds` from request body
- Updated `update` handler to handle `webhookDestinationIds` updates
- The `formatDeploymentEmbeddingForResponse` function already included webhook data in responses

## Frontend Changes

### DeploymentEmbeddingTable.vue
- Added "Webhook" column to the table header
- Added webhook display logic showing destination names as badges
- Added `webhookNames` reactive variable for caching webhook destination names
- Added `loadWebhookNames()` function to fetch webhook destination names from settings API
- Updated table body to display webhook destinations similar to DeploymentsTable.vue
- Updated empty state colspan from 6 to 7 columns

### CreateEditDeploymentEmbeddingDialog.vue
- Added webhook destination selection dropdown
- Added `webhookDestinations` reactive array for available webhook destinations
- Added `selectedWebhookDestination` reactive variable for current selection
- Added `loadWebhookDestinations()` function to load available webhook destinations
- Updated form initialization to handle webhook selection for both create and edit modes
- Updated `saveDeploymentEmbedding()` to include `webhookDestinationIds` in API requests
- Added "None" option for deployments without webhook notifications

## User Experience
- Users can now select webhook destinations when creating or editing deployment embeddings
- The webhook column in the table shows configured destinations as badges
- Webhook destination names are resolved from IDs for better readability
- The interface follows the same patterns as regular deployment webhook configuration

## Technical Details
- Supports single webhook destination selection (similar to regular deployments)
- Webhook destinations are stored as an array of IDs for future extensibility
- Uses existing webhook destination management system from settings
- Maintains type safety throughout the API and UI layers
- Follows established patterns for webhook integration in the application
