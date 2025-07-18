// Re-export toast functionality
export { useToast } from '@/components/ui/toast'
export type { ToastOptions, ToastItem } from '@/components/ui/toast'

// Re-export confirmation dialog functionality
export { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
export type { ConfirmationOptions } from '@/components/ui/confirmation-dialog'

// Combined UI service for convenience
import { useToast } from '@/components/ui/toast'
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'

export const useUI = () => {
    const toast = useToast()
    const confirm = useConfirmationDialog()

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
    }
}
