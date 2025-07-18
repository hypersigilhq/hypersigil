import { ref } from 'vue'
import type { ConfirmationOptions, ConfirmationDialogState } from './index'

// Global confirmation dialog state
const dialogState = ref<ConfirmationDialogState>({
    isOpen: false,
    options: {},
    resolve: undefined,
})

// Store for managing global confirmation dialog state
export const useConfirmationDialogStore = () => {
    const showDialog = (options: ConfirmationOptions | string): Promise<boolean> => {
        return new Promise((resolve) => {
            const dialogOptions: ConfirmationOptions = typeof options === 'string'
                ? { message: options }
                : options

            dialogState.value = {
                isOpen: true,
                options: {
                    title: 'Confirm Action',
                    message: 'Are you sure you want to continue?',
                    confirmText: 'Confirm',
                    cancelText: 'Cancel',
                    variant: 'default',
                    icon: 'question',
                    ...dialogOptions,
                },
                resolve,
            }
        })
    }

    const handleConfirm = () => {
        if (dialogState.value.resolve) {
            dialogState.value.resolve(true)
        }
        closeDialog()
    }

    const handleCancel = () => {
        if (dialogState.value.resolve) {
            dialogState.value.resolve(false)
        }
        closeDialog()
    }

    const closeDialog = () => {
        dialogState.value = {
            isOpen: false,
            options: {},
            resolve: undefined,
        }
    }

    return {
        dialogState,
        showDialog,
        handleConfirm,
        handleCancel,
        closeDialog,
    }
}

// Composable for using confirmation dialog in components
export const useConfirmationDialog = () => {
    const store = useConfirmationDialogStore()

    const confirm = (options: ConfirmationOptions | string = 'Are you sure you want to continue?'): Promise<boolean> => {
        return store.showDialog(options)
    }

    const confirmDelete = (itemName?: string): Promise<boolean> => {
        return store.showDialog({
            title: 'Delete Item',
            message: itemName
                ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
                : 'Are you sure you want to delete this item? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'destructive',
            icon: 'warning',
        })
    }

    const confirmAction = (action: string, description?: string): Promise<boolean> => {
        return store.showDialog({
            title: `Confirm ${action}`,
            message: description || `Are you sure you want to ${action.toLowerCase()}?`,
            confirmText: action,
            cancelText: 'Cancel',
            variant: 'default',
            icon: 'question',
        })
    }

    return {
        confirm,
        confirmDelete,
        confirmAction,
        show: confirm, // Alias for backward compatibility
    }
}
