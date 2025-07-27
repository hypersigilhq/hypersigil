import { onUnmounted, watch, ref, type Ref } from 'vue'
import { useEventBus, type EventMap, type EventListener } from './event-bus'

// Composable for auto-cleanup event listeners
export const useEventListener = <K extends keyof EventMap>(
    event: K,
    listener: EventListener<EventMap[K]>,
    options: { once?: boolean } = {}
) => {
    const { on, once } = useEventBus()

    const unsubscribe = options.once ? once(event, listener) : on(event, listener)

    // Auto cleanup on component unmount
    onUnmounted(() => {
        unsubscribe()
    })

    return unsubscribe
}

// Composable for reactive event state
export const useEventState = <K extends keyof EventMap>(
    event: K,
    initialValue: EventMap[K] | null = null
) => {
    const state = ref<EventMap[K] | null>(initialValue)

    useEventListener(event, (payload) => {
        state.value = payload
    })

    return state
}

// Composable for event-driven data fetching
export const useEventRefresh = <T>(
    refreshEvents: (keyof EventMap)[],
    refreshFn: () => Promise<T> | T,
    options: {
        immediate?: boolean
        debounceMs?: number
    } = {}
) => {
    const { immediate = false, debounceMs = 0 } = options
    const data: Ref<T | null> = ref(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    let debounceTimer: NodeJS.Timeout | null = null

    const executeRefresh = async () => {
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(async () => {
            loading.value = true
            error.value = null

            try {
                const result = await refreshFn()
                data.value = result
            } catch (err) {
                error.value = err instanceof Error ? err.message : 'Unknown error'
            } finally {
                loading.value = false
            }
        }, debounceMs)
    }

    // Listen to all specified events
    refreshEvents.forEach(event => {
        useEventListener(event, executeRefresh)
    })

    // Execute immediately if requested
    if (immediate) {
        executeRefresh()
    }

    return {
        data,
        loading,
        error,
        refresh: executeRefresh
    }
}

// Composable for event-driven form validation
export const useEventValidation = <T extends Record<string, any>>(
    validationEvents: (keyof EventMap)[],
    validationFn: (data: T) => Record<keyof T, string | null>
) => {
    const errors = ref<Record<keyof T, string | null>>({} as Record<keyof T, string | null>)
    const isValid = ref(true)

    const validate = (data: T) => {
        const validationErrors = validationFn(data)
        errors.value = validationErrors

        isValid.value = Object.values(validationErrors).every(error => error === null)
        return isValid.value
    }

    // Listen to validation events
    validationEvents.forEach(event => {
        useEventListener(event, (payload) => {
            if (payload && typeof payload === 'object') {
                validate(payload as unknown as T)
            }
        })
    })

    return {
        errors,
        isValid,
        validate
    }
}

// Composable for event-driven authentication state
export const useEventAuth = () => {
    const isAuthenticated = ref(false)
    const currentUser = ref<{ userId: string; email: string } | null>(null)

    useEventListener('auth:login', (payload) => {
        isAuthenticated.value = true
        currentUser.value = payload
    })

    useEventListener('auth:logout', () => {
        isAuthenticated.value = false
        currentUser.value = null
    })

    useEventListener('auth:token-expired', () => {
        isAuthenticated.value = false
        currentUser.value = null
    })

    return {
        isAuthenticated,
        currentUser
    }
}

// Utility for creating custom event patterns
export const createEventPattern = <T>(
    events: (keyof EventMap)[],
    handler: (payload: any) => T,
    options: {
        immediate?: boolean
        debounceMs?: number
    } = {}
) => {
    const { immediate = false, debounceMs = 0 } = options
    const result = ref<T | null>(null)

    let debounceTimer: NodeJS.Timeout | null = null

    const executeHandler = (payload: any) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
            result.value = handler(payload)
        }, debounceMs)
    }

    events.forEach(event => {
        useEventListener(event, executeHandler)
    })

    if (immediate) {
        executeHandler(null)
    }

    return result
}
