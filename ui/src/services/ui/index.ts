// Re-export toast functionality
export { useToast } from '@/components/ui/toast'
export type { ToastOptions, ToastItem } from '@/components/ui/toast'

// Re-export confirmation dialog functionality
export { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
export type { ConfirmationOptions } from '@/components/ui/confirmation-dialog'

// Re-export topbar alert functionality
export { useTopbarAlert } from '@/components/ui/alert'
export type { AlertOptions, AlertItem } from '@/components/ui/alert'

// Re-export event bus functionality
export { useEventBus, useEventListener, events } from '../events'
export type { EventMap, EventListener } from '../events'

// Combined UI service for convenience
import { useToast } from '@/components/ui/toast'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useTopbarAlert } from '@/components/ui/alert'
import { useEventBus } from '../events'

export const useUI = () => {
    const toast = useToast()
    const confirm = useConfirmationDialog()
    const topbar = useTopbarAlert()
    const eventBus = useEventBus()

    return {
        // Toast methods
        toast: toast.toast,
        success: toast.success,
        error: toast.error,
        warning: toast.warning,
        info: toast.info,
        dismissToast: toast.dismiss,
        clearToasts: toast.clear,

        // Confirmation methods
        confirm: confirm.confirm,
        confirmDelete: confirm.confirmDelete,
        confirmAction: confirm.confirmAction,

        // Topbar alert methods
        showTopbarAlert: topbar.showAlert,
        topbarSuccess: topbar.success,
        topbarWarning: topbar.warning,
        topbarError: topbar.error,
        dismissTopbarAlert: topbar.dismissAlert,

        // Event bus methods
        emit: eventBus.emit,
        on: eventBus.on,
        once: eventBus.once,
        off: eventBus.off,
    }
}
