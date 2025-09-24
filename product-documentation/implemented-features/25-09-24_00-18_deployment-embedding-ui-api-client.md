# Deployment Embedding UI API Client

## Overview
Implemented the UI API client for deployment embeddings, providing a typed interface for frontend components to interact with the deployment embedding backend API. This enables UI components to perform CRUD operations and job scheduling for embedding generation tasks.

## Architecture

### API Client (`ui/src/services/api-client/deployment-embedding.ts`)
- **deploymentEmbeddingApiClient** - ApiClient instance configured for deployment embeddings
- **deploymentEmbeddingsApi** - Exported API methods object following established patterns
- Full type safety using imported definitions and types
- Event emission for create/update/delete operations

### Event Integration (`ui/src/services/event-bus.ts`)
- Added deployment-embedding event types to EventMap interface
- Events: `deployment-embedding:created`, `deployment-embedding:updated`, `deployment-embedding:deleted`
- Proper payload structure with IDs and names for UI reactivity

### API Client Registration (`ui/src/services/api-client/index.ts`)
- Imported and exported deploymentEmbeddingsApi for global access
- Added deploymentEmbeddingApiClient to token management system
- Integrated with authentication flow for automatic token handling

## Key Features

### Type-Safe API Methods
- `list()` - Paginated listing with search and sorting
- `create()` - Create new deployment embedding records
- `getById()` - Retrieve by UUID
- `getByName()` - Retrieve by slug name
- `update()` - Modify existing records
- `delete()` - Remove records
- `run()` - Schedule embedding generation jobs

### Event-Driven Architecture
- Automatic event emission on successful operations
- Enables reactive UI updates across components
- Consistent with existing deployment API patterns

### Authentication Integration
- Automatic Bearer token handling via global API client management
- Seamless integration with existing auth system
- No manual token management required

## API Methods

### List Deployments
```typescript
deploymentEmbeddingsApi.list({
    query: {
        page: '1',
        limit: '10',
        search: 'my-embedding',
        orderBy: 'created_at',
        orderDirection: 'DESC'
    }
})
```

### Create Deployment
```typescript
deploymentEmbeddingsApi.create({
    name: 'my-embedding-job',
    inputs: ['Hello world', 'How are you?'],
    model: 'voyage-3-large',
    inputType: 'document'
})
```

### Run Job
```typescript
deploymentEmbeddingsApi.run('my-embedding-job')
```

## Integration Points

### Event Bus
- Components can listen for deployment-embedding events
- Enables real-time UI updates without polling
- Consistent event naming and payload structure

### Global API Management
- Automatic token propagation to all API clients
- Centralized authentication state management
- Simplified component code

### Type System
- Full TypeScript support with imported Zod schemas
- Compile-time validation of API calls
- IntelliSense support in IDEs

## Usage in Components

```vue
<script setup lang="ts">
import { deploymentEmbeddingsApi } from '@/services/api-client'
import { useEventBus } from '@/services/event-bus'

const { on } = useEventBus()

// Listen for deployment embedding events
on('deployment-embedding:created', (payload) => {
    console.log('New deployment embedding created:', payload.name)
})

// Create a new deployment embedding
const createEmbedding = async () => {
    try {
        const result = await deploymentEmbeddingsApi.create({
            name: 'test-embedding',
            inputs: ['test input'],
            model: 'voyage-3-large'
        })
        console.log('Created:', result)
    } catch (error) {
        console.error('Failed to create:', error)
    }
}
</script>
```

## Error Handling

- Consistent error handling via `errorHandle` import
- Automatic toast notifications for API errors
- Type-safe error responses

## Security

- Inherits authentication from global API client configuration
- No additional security implementation required
- Leverages existing permission system

## Performance

- Efficient API client instantiation
- Minimal bundle impact with tree-shaking
- Event-driven updates reduce unnecessary re-renders

## Future Enhancements

- Real-time job status updates via WebSocket
- Bulk operations support
- Advanced filtering UI components
- Job progress indicators
- Result preview functionality
