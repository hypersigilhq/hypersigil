import { useEventBus } from './events'
import { useOnboarding } from './onboarding'
import type { EventMap } from './event-bus'

// Type for event listener configurations
interface EventListenerConfig<K extends keyof EventMap> {
    event: K | K[]
    handler: (payload: EventMap[K]) => void | Promise<void>
    description?: string
}

// Global event listeners service
class GlobalEventListenersService {
    private unsubscribeFunctions: (() => void)[] = []
    private isInitialized = false

    // Define all global event listeners here
    private getEventListenerConfigs(): EventListenerConfig<keyof EventMap>[] {
        const { checkOnboardingStatus } = useOnboarding()

        return [
            {
                event: ['app:loaded', 'prompt:created', 'settings:llm-api-key-added', 'settings:llm-api-key-removed'],
                handler: () => {
                    checkOnboardingStatus()
                },
                description: 'Check onboarding status on key application events'
            }
        ]
    }

    // Initialize all global event listeners
    initialize(): void {
        if (this.isInitialized) {
            console.warn('Global event listeners already initialized')
            return
        }

        const { on } = useEventBus()
        const configs = this.getEventListenerConfigs()

        configs.forEach(config => {
            try {
                const events = Array.isArray(config.event) ? config.event : [config.event]

                events.forEach(event => {
                    const unsubscribe = on(event, config.handler)
                    this.unsubscribeFunctions.push(unsubscribe)

                    if (config.description) {
                        console.debug(`Global event listener registered: ${event} - ${config.description}`)
                    }
                })
            } catch (error) {
                const eventNames = Array.isArray(config.event) ? config.event.join(', ') : config.event
                console.error(`Failed to register global event listener for ${eventNames}:`, error)
            }
        })

        this.isInitialized = true
        console.debug(`Initialized ${configs.length} global event listeners`)
    }

    // Clean up all event listeners
    cleanup(): void {
        this.unsubscribeFunctions.forEach(unsubscribe => {
            try {
                unsubscribe()
            } catch (error) {
                console.error('Error cleaning up event listener:', error)
            }
        })

        this.unsubscribeFunctions = []
        this.isInitialized = false
        console.debug('Cleaned up all global event listeners')
    }

    // Get initialization status
    getInitializationStatus(): boolean {
        return this.isInitialized
    }

    // Get count of active listeners
    getActiveListenerCount(): number {
        return this.unsubscribeFunctions.length
    }
}

// Create singleton instance
const globalEventListenersService = new GlobalEventListenersService()

// Composable for using the global event listeners service
export const useGlobalEventListeners = () => {
    return {
        initialize: () => globalEventListenersService.initialize(),
        cleanup: () => globalEventListenersService.cleanup(),
        isInitialized: () => globalEventListenersService.getInitializationStatus(),
        activeListenerCount: () => globalEventListenersService.getActiveListenerCount()
    }
}

// Direct access for non-composable contexts
export { globalEventListenersService }
