export { default as ConfirmationDialog } from './ConfirmationDialog.vue'
export { default as GlobalConfirmationDialog } from './GlobalConfirmationDialog.vue'
export { useConfirmationDialog } from './useConfirmationDialog'

export interface ConfirmationOptions {
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'destructive'
    icon?: 'warning' | 'question' | 'info' | 'error'
}

export interface ConfirmationDialogState {
    isOpen: boolean
    options: ConfirmationOptions
    resolve?: (value: boolean) => void
}
