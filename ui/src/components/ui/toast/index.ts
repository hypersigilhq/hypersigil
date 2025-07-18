import { cva, type VariantProps } from 'class-variance-authority'

export { default as Toast } from './Toast.vue'
export { default as ToastContainer } from './ToastContainer.vue'
export { useToast } from './useToast'

export const toastVariants = cva(
    'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
    {
        variants: {
            variant: {
                default: 'border bg-background text-foreground',
                success:
                    'success group border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50',
                error:
                    'destructive group border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50',
                warning:
                    'warning group border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-50',
                info:
                    'info group border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

export type ToastVariants = VariantProps<typeof toastVariants>

export interface ToastOptions {
    id?: string
    title?: string
    description?: string
    variant?: ToastVariants['variant']
    duration?: number
    dismissible?: boolean
    action?: {
        label: string
        onClick: () => void
    }
}

export interface ToastItem extends Required<Omit<ToastOptions, 'action'>> {
    action?: ToastOptions['action']
    createdAt: number
}
