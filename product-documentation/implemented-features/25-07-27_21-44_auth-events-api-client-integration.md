25-07-27_21-44

# Auth Events API Client Integration

## Overview

This feature implements event emitters in the API client that automatically emit events when successful API responses occur, particularly for authentication operations. This creates a reactive event-driven architecture that allows components to respond to auth state changes automatically.

## Implementation Details

### Event Bus Integration

The API client now imports and uses the event bus to emit events on successful API responses:

```typescript
import { eventBus } from './event-bus';
```

### Token Expiration Detection

The error handler now detects 401 (Unauthorized) responses and automatically emits a token expiration event:

```typescript
let errorHandle = {
    401: (payload: { data: { error: string, message?: string, details?: unknown } }) => {
        // Emit token expired event for 401 errors
        eventBus.emit('auth:token-expired');
        throw new Error(payload.data?.error + ": " + payload.data.message || 'Unauthorized');
    },
    // ... other error handlers
}
```

### Authentication Events

#### Login Events
All authentication operations that result in a successful login now emit `auth:login` events:

- **Login**: `authApi.login()` emits event with user data
- **Register First Admin**: `authApi.registerFirstAdmin()` emits event with user data  
- **User Activation**: `authApi.activate()` emits event with user data

```typescript
login: (body: LoginRequest) =>
    authApiClient.callApi('auth', 'login', { body }, {
        ...errorHandle,
        200: (payload) => {
            // Emit login event with user data
            if (payload.data?.user) {
                eventBus.emit('auth:login', {
                    userId: payload.data.user.email, // Use email as userId since id is not available
                    email: payload.data.user.email
                });
            }
            return payload.data;
        },
    }),
```

#### Logout Events
The `useAuth` composable now emits logout events when the user logs out:

```typescript
const logout = (): void => {
    // Emit logout event
    eventBus.emit('auth:logout')
    
    // Clear auth state and redirect
    // ...
}
```

### Prompt Events

The API client now emits events for prompt operations:

- **Create**: `prompt:created` with `promptId` and `name`
- **Update**: `prompt:updated` with `promptId` and `name`  
- **Delete**: `prompt:deleted` with `promptId`

### Settings Events

LLM API key management operations emit events:

- **Create**: `settings:llm-api-key-added` with `provider`
- **Delete**: Limited due to API response structure (only returns `{ success: boolean }`)

### useAuth Integration

The `useAuth` composable now integrates with the event system:

1. **Listens for token expiration**: Automatically logs out user when `auth:token-expired` is emitted
2. **Emits logout events**: When `logout()` is called, emits `auth:logout` event

```typescript
export function useAuth() {
    // Listen for token expiration events
    useEventListener('auth:token-expired', () => {
        logout()
    })
    
    // ... rest of implementation
}
```

## Event Types

The following events are now automatically emitted by the API client:

### Authentication Events
- `auth:login` - Emitted on successful login/registration/activation
- `auth:logout` - Emitted when user logs out
- `auth:token-expired` - Emitted on 401 responses

### Prompt Events  
- `prompt:created` - Emitted when prompt is created
- `prompt:updated` - Emitted when prompt is updated
- `prompt:deleted` - Emitted when prompt is deleted

### Settings Events
- `settings:llm-api-key-added` - Emitted when LLM API key is added
- `settings:llm-api-key-removed` - Limited implementation due to API constraints

## Usage Examples

### Listening to Auth Events

Components can now use the event patterns to react to auth changes:

```typescript
import { useEventAuth } from '@/services/event-patterns'

export default {
    setup() {
        const { isAuthenticated, currentUser } = useEventAuth()
        
        // Reactive state that updates automatically
        return { isAuthenticated, currentUser }
    }
}
```

### Listening to Specific Events

```typescript
import { useEventListener } from '@/services/event-patterns'

export default {
    setup() {
        useEventListener('auth:login', (payload) => {
            console.log('User logged in:', payload.email)
        })
        
        useEventListener('prompt:created', (payload) => {
            console.log('Prompt created:', payload.name)
        })
    }
}
```

## Benefits

1. **Automatic State Synchronization**: Components automatically stay in sync with auth state changes
2. **Decoupled Architecture**: Components don't need direct references to auth services
3. **Token Expiration Handling**: Automatic logout on token expiration across the entire app
4. **Event-Driven Updates**: UI can react to data changes without manual refresh calls
5. **Centralized Event Management**: All API-related events flow through a single event bus

## Technical Notes

### User ID Limitation
Due to the current API response structure, the `userId` in auth events uses the user's email address since the actual user ID is not available in the login response schema.

### Settings Delete Limitation  
The settings delete endpoint only returns `{ success: boolean }`, so we cannot emit specific provider removal events without additional context.

## Future Enhancements

1. **Enhanced User Data**: Update API responses to include user ID for more accurate event payloads
2. **More Granular Events**: Add events for other API operations (executions, test data, etc.)
3. **Event Persistence**: Consider persisting certain events for offline/reconnection scenarios
4. **Event Middleware**: Add middleware for event transformation or filtering
