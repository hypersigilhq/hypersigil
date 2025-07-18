import { ref, reactive } from 'vue'
import type { ToastItem, ToastOptions } from './index'

// Global toast state
const toasts = ref<ToastItem[]>([])

// Auto-dismiss timers
const timers = new Map<string, NodeJS.Timeout>()

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15)

// Toast store for managing global state
export const useToastStore = () => {
    const addToast = (options: ToastOptions): string => {
        const id = options.id || generateId()
        const duration = options.duration ?? 5000
        const dismissible = options.dismissible ?? true

        const toast: ToastItem = {
            id,
            title: options.title || '',
            description: options.description || '',
            variant: options.variant || 'default',
            duration,
            dismissible,
            action: options.action,
            createdAt: Date.now(),
        }

        toasts.value.push(toast)

        // Auto-dismiss if duration is set
        if (duration > 0) {
            const timer = setTimeout(() => {
                removeToast(id)
            }, duration)
            timers.set(id, timer)
        }

        return id
    }

    const removeToast = (id: string) => {
        const index = toasts.value.findIndex(toast => toast.id === id)
        if (index > -1) {
            toasts.value.splice(index, 1)
        }

        // Clear timer if exists
        const timer = timers.get(id)
        if (timer) {
            clearTimeout(timer)
            timers.delete(id)
        }
    }

    const clearAllToasts = () => {
        toasts.value = []
        // Clear all timers
        timers.forEach(timer => clearTimeout(timer))
        timers.clear()
    }

    return {
        toasts,
        addToast,
        removeToast,
        clearAllToasts,
    }
}

// Composable for using toasts in components
export const useToast = () => {
    const store = useToastStore()

    const toast = (options: ToastOptions | string) => {
        if (typeof options === 'string') {
            return store.addToast({ description: options })
        }
        return store.addToast(options)
    }

    const success = (message: string, options?: Omit<ToastOptions, 'variant' | 'description'>) => {
        return store.addToast({
            ...options,
            description: message,
            variant: 'success',
        })
    }

    const error = (message: string, options?: Omit<ToastOptions, 'variant' | 'description'>) => {
        return store.addToast({
            ...options,
            description: message,
            variant: 'error',
        })
    }

    const warning = (message: string, options?: Omit<ToastOptions, 'variant' | 'description'>) => {
        return store.addToast({
            ...options,
            description: message,
            variant: 'warning',
        })
    }

    const info = (message: string, options?: Omit<ToastOptions, 'variant' | 'description'>) => {
        return store.addToast({
            ...options,
            description: message,
            variant: 'info',
        })
    }

    return {
        toast,
        success,
        error,
        warning,
        info,
        dismiss: store.removeToast,
        clear: store.clearAllToasts,
    }
}
