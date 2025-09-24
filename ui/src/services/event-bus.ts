import { ref, type Ref } from 'vue'

// Event type definitions
export interface EventMap {
    'app:loaded': void,
    // Authentication events
    'auth:login': { userId: string; email: string }
    'auth:logout': void
    'auth:token-expired': void

    // Prompt events
    'prompt:created': { promptId: string; name: string }
    'prompt:updated': { promptId: string; name: string }
    'prompt:deleted': { promptId: string }

    // File events
    'file:created': { fileId: string; name: string }
    'file:deleted': { fileId: string }

    // Deployment events
    'deployment:created': { deploymentId: string; name: string }
    'deployment:updated': { deploymentId: string; name: string }
    'deployment:deleted': { deploymentId: string }

    // Deployment embedding events
    'deployment-embedding:created': { deploymentEmbeddingId: string; name: string }
    'deployment-embedding:updated': { deploymentEmbeddingId: string; name: string }
    'deployment-embedding:deleted': { deploymentEmbeddingId: string }

    // Settings events
    'settings:llm-api-key-added': { provider: string }
    'settings:llm-api-key-removed': { provider: string }
}

// Event listener type
type EventListener<T> = (payload: T) => void

// Event bus class
class TypedEventBus {
    private listeners: Map<keyof EventMap, Set<EventListener<any>>> = new Map()
    private onceListeners: Map<keyof EventMap, Set<EventListener<any>>> = new Map()

    // Subscribe to an event
    on<K extends keyof EventMap>(
        event: K,
        listener: EventListener<EventMap[K]>
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }

        this.listeners.get(event)!.add(listener)

        // Return unsubscribe function
        return () => this.off(event, listener)
    }

    // Subscribe to an event once
    once<K extends keyof EventMap>(
        event: K,
        listener: EventListener<EventMap[K]>
    ): () => void {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set())
        }

        this.onceListeners.get(event)!.add(listener)

        // Return unsubscribe function
        return () => this.offOnce(event, listener)
    }

    // Unsubscribe from an event
    off<K extends keyof EventMap>(
        event: K,
        listener: EventListener<EventMap[K]>
    ): void {
        const eventListeners = this.listeners.get(event)
        if (eventListeners) {
            eventListeners.delete(listener)
            if (eventListeners.size === 0) {
                this.listeners.delete(event)
            }
        }
    }

    // Unsubscribe from a once event
    private offOnce<K extends keyof EventMap>(
        event: K,
        listener: EventListener<EventMap[K]>
    ): void {
        const eventListeners = this.onceListeners.get(event)
        if (eventListeners) {
            eventListeners.delete(listener)
            if (eventListeners.size === 0) {
                this.onceListeners.delete(event)
            }
        }
    }

    // Emit an event
    emit<K extends keyof EventMap>(
        event: K,
        ...args: EventMap[K] extends void ? [] : [EventMap[K]]
    ): void {
        const payload = args[0] as EventMap[K]

        // Call regular listeners
        const eventListeners = this.listeners.get(event)
        if (eventListeners) {
            eventListeners.forEach(listener => {
                try {
                    listener(payload)
                } catch (error) {
                    console.error(`Error in event listener for ${String(event)}:`, error)
                }
            })
        }

        // Call once listeners and remove them
        const onceListeners = this.onceListeners.get(event)
        if (onceListeners) {
            onceListeners.forEach(listener => {
                try {
                    listener(payload)
                } catch (error) {
                    console.error(`Error in once event listener for ${String(event)}:`, error)
                }
            })
            this.onceListeners.delete(event)
        }
    }

    // Remove all listeners for an event
    removeAllListeners<K extends keyof EventMap>(event?: K): void {
        if (event) {
            this.listeners.delete(event)
            this.onceListeners.delete(event)
        } else {
            this.listeners.clear()
            this.onceListeners.clear()
        }
    }

    // Get listener count for an event
    listenerCount<K extends keyof EventMap>(event: K): number {
        const regularCount = this.listeners.get(event)?.size || 0
        const onceCount = this.onceListeners.get(event)?.size || 0
        return regularCount + onceCount
    }

    // Get all event names that have listeners
    eventNames(): (keyof EventMap)[] {
        const events = new Set<keyof EventMap>()
        this.listeners.forEach((_, event) => events.add(event))
        this.onceListeners.forEach((_, event) => events.add(event))
        return Array.from(events)
    }
}

// Global event bus instance
const eventBus = new TypedEventBus()

// Composable for using the event bus
export const useEventBus = () => {
    // Reactive state for tracking active listeners (useful for debugging)
    const activeListeners: Ref<Record<string, number>> = ref({})

    const updateActiveListeners = () => {
        const listeners: Record<string, number> = {}
        eventBus.eventNames().forEach(event => {
            listeners[String(event)] = eventBus.listenerCount(event)
        })
        activeListeners.value = listeners
    }

    // Enhanced methods that update reactive state
    const on = <K extends keyof EventMap>(
        event: K,
        listener: EventListener<EventMap[K]>
    ) => {
        const unsubscribe = eventBus.on(event, listener)
        updateActiveListeners()

        return () => {
            unsubscribe()
            updateActiveListeners()
        }
    }

    const once = <K extends keyof EventMap>(
        event: K,
        listener: EventListener<EventMap[K]>
    ) => {
        const unsubscribe = eventBus.once(event, listener)
        updateActiveListeners()

        return () => {
            unsubscribe()
            updateActiveListeners()
        }
    }

    const emit = <K extends keyof EventMap>(
        event: K,
        ...args: EventMap[K] extends void ? [] : [EventMap[K]]
    ) => {
        eventBus.emit(event, ...args)
    }

    const off = <K extends keyof EventMap>(
        event: K,
        listener: EventListener<EventMap[K]>
    ) => {
        eventBus.off(event, listener)
        updateActiveListeners()
    }

    const removeAllListeners = <K extends keyof EventMap>(event?: K) => {
        eventBus.removeAllListeners(event)
        updateActiveListeners()
    }

    // Initialize active listeners state
    updateActiveListeners()

    return {
        on,
        once,
        emit,
        off,
        removeAllListeners,
        listenerCount: eventBus.listenerCount.bind(eventBus),
        eventNames: eventBus.eventNames.bind(eventBus),
        activeListeners: activeListeners.value
    }
}

// Direct access to event bus for non-composable contexts
export { eventBus }

// Type exports for external use
export type { EventListener }
