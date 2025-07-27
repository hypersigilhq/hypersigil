import { ref, computed } from 'vue'
import type { AlertOptions, AlertItem } from './index'

const alerts = ref<AlertItem[]>([])
let nextId = 1

export const useTopbarAlert = () => {
    const showAlert = (options: AlertOptions) => {
        const alert: AlertItem = {
            id: options.id || `alert-${nextId++}`,
            title: options.title || '',
            description: options.description || '',
            variant: options.variant || 'success',
            dismissible: options.dismissible ?? true,
            createdAt: Date.now(),
        }

        // Remove any existing alert (only show one at a time)
        alerts.value = [alert]

        return alert.id
    }

    const dismissAlert = (id?: string) => {
        if (id) {
            alerts.value = alerts.value.filter(alert => alert.id !== id)
        } else {
            // Dismiss all alerts
            alerts.value = []
        }
    }

    const success = (title: string, description?: string, options?: Omit<AlertOptions, 'variant' | 'title' | 'description'>) => {
        return showAlert({ ...options, variant: 'success', title, description })
    }

    const warning = (title: string, description?: string, options?: Omit<AlertOptions, 'variant' | 'title' | 'description'>) => {
        return showAlert({ ...options, variant: 'warning', title, description })
    }

    const error = (title: string, description?: string, options?: Omit<AlertOptions, 'variant' | 'title' | 'description'>) => {
        return showAlert({ ...options, variant: 'error', title, description })
    }

    const currentAlert = computed(() => alerts.value[0] || null)

    return {
        alerts: computed(() => alerts.value),
        currentAlert,
        showAlert,
        dismissAlert,
        success,
        warning,
        error,
    }
}
