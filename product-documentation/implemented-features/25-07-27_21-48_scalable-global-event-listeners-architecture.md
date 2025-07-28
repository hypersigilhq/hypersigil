25-07-27_21-48

# Scalable Global Event Listeners Architecture

## Overview
Implemented a scalable architecture for managing global event listeners in the UI application. This system centralizes all global event listeners in a dedicated service, making it easy to add, manage, and maintain event listeners across the application.

## Architecture Components

### 1. Global Event Listeners Service (`ui/src/services/global-event-listeners.ts`)

**Key Features:**
- Centralized management of all global event listeners
- Type-safe event listener configurations
- Automatic initialization and cleanup
- Error handling and logging
- Singleton pattern for consistent state management

**Core Components:**
- `EventListenerConfig<K>` interface for type-safe listener definitions
- `GlobalEventListenersService` class for managing listeners
- `useGlobalEventListeners()` composable for Vue integration

### 2. Event Listener Configuration System

**Configuration Structure:**
```typescript
interface EventListenerConfig<K extends keyof EventMap> {
    event: K
    handler: (payload: EventMap[K]) => void | Promise<void>
    description?: string
}
```

**Current Listeners:**
- `prompt:created` → Triggers onboarding status check
- Ready for additional listeners (examples provided in comments)

### 3. Integration with App.vue

**Simplified Integration:**
- Single `initialize()` call in `onMounted`
- Single `cleanup()` call in `onUnmounted`
- No need to manage individual unsubscribe functions

## Implementation Details

### Service Architecture

**Initialization Process:**
1. Check if already initialized (prevents double initialization)
2. Get event listener configurations
3. Register each listener with the event bus
4. Store unsubscribe functions for cleanup
5. Log successful registrations

**Cleanup Process:**
1. Call all stored unsubscribe functions
2. Clear the unsubscribe functions array
3. Reset initialization status
4. Log cleanup completion

### Error Handling

**Robust Error Management:**
- Try-catch blocks around listener registration
- Error logging for failed registrations
- Graceful handling of cleanup errors
- Prevents single listener failures from affecting others

### Type Safety

**Full TypeScript Integration:**
- Generic types for event listener configurations
- Type-safe event handlers
- Leverages existing EventMap from event bus
- Compile-time validation of event types

## Usage Examples

### Adding New Global Event Listeners

To add a new global event listener, simply add it to the configuration array:

```typescript
// In getEventListenerConfigs() method
{
    event: 'settings:llm-api-key-added',
    handler: (payload) => {
        // Handle API key added event
        console.log(`API key added for provider: ${payload.provider}`)
        // Trigger any necessary updates
    },
    description: 'Handle LLM API key addition'
}
```

### Service Usage in Components

```typescript
import { useGlobalEventListeners } from '@/services/events'

const { initialize, cleanup, isInitialized, activeListenerCount } = useGlobalEventListeners()

// Check if initialized
if (isInitialized()) {
    console.log(`Active listeners: ${activeListenerCount()}`)
}
```

## Benefits

### 1. Scalability
- Easy to add new global event listeners
- Centralized configuration management
- No need to modify App.vue for new listeners

### 2. Maintainability
- Single source of truth for global listeners
- Clear separation of concerns
- Descriptive listener documentation

### 3. Reliability
- Automatic cleanup prevents memory leaks
- Error handling prevents cascading failures
- Initialization guards prevent double registration

### 4. Developer Experience
- Type-safe listener definitions
- Clear logging for debugging
- Simple API for service interaction

## Current Implementation

### Active Global Listeners

1. **Prompt Created Handler**
   - Event: `prompt:created`
   - Action: Calls `checkOnboardingStatus()`
   - Purpose: Updates onboarding status when prompts are created

### Integration Points

- **App.vue**: Service initialization and cleanup
- **Events Index**: Service export for easy access
- **Event Bus**: Underlying event system integration
- **Onboarding Service**: Consumer of prompt creation events

## Future Enhancements

### Planned Features
- Dynamic listener registration/deregistration
- Listener priority system
- Event listener metrics and monitoring
- Conditional listener activation based on user state

### Extension Points
- Additional event types in EventMap
- Custom listener middleware
- Event listener grouping and categorization
- Performance monitoring for listener execution

## Migration Guide

### From Individual Listeners to Service

**Before:**
```typescript
// In App.vue
let unsubscribePromptCreated: (() => void) | null = null

onMounted(() => {
    unsubscribePromptCreated = on('prompt:created', () => {
        checkOnboardingStatus()
    })
})

onUnmounted(() => {
    if (unsubscribePromptCreated) {
        unsubscribePromptCreated()
    }
})
```

**After:**
```typescript
// In App.vue
const { initialize, cleanup } = useGlobalEventListeners()

onMounted(() => {
    initialize()
})

onUnmounted(() => {
    cleanup()
})
```

This architecture provides a solid foundation for managing global event listeners that can easily scale as the application grows and requires more event-driven functionality.
