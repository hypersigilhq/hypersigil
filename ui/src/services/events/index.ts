// Main event bus exports
export { useEventBus, eventBus, type EventMap, type EventListener } from '../event-bus'

// Event pattern utilities
export {
    useEventListener,
    useEventState,
    useEventRefresh,
    useEventValidation,
    useEventAuth,
    createEventPattern
} from '../event-patterns'

// Import eventBus for internal use
import { eventBus } from '../event-bus'

// Convenience re-export for common usage
export const events = {
    // Direct bus access
    bus: eventBus,

    // Common event emitters
    auth: {
        login: (userId: string, email: string) => eventBus.emit('auth:login', { userId, email }),
        logout: () => eventBus.emit('auth:logout'),
        tokenExpired: () => eventBus.emit('auth:token-expired')
    },

    prompt: {
        created: (promptId: string, name: string) =>
            eventBus.emit('prompt:created', { promptId, name }),
        updated: (promptId: string, name: string) =>
            eventBus.emit('prompt:updated', { promptId, name }),
        deleted: (promptId: string) =>
            eventBus.emit('prompt:deleted', { promptId })
    },

    settings: {
        llmApiKeyAdded: (provider: string) =>
            eventBus.emit('settings:llm-api-key-added', { provider }),
        llmApiKeyRemoved: (provider: string) =>
            eventBus.emit('settings:llm-api-key-removed', { provider }),
    },
}
