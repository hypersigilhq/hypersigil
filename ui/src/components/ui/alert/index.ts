import { cva, type VariantProps } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as GlobalTopbar } from './GlobalTopbar.vue'
export { useTopbarAlert } from './useTopbarAlert'

export const alertVariants = cva(
    'w-full border px-4 py-3 text-sm',
    {
        variants: {
            variant: {
                success:
                    'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50',
                warning:
                    'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-700 dark:text-yellow-50',
                error:
                    'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50',
            },
        },
        defaultVariants: {
            variant: 'success',
        },
    },
)

export type AlertVariants = VariantProps<typeof alertVariants>

export interface AlertOptions {
    id?: string
    title?: string
    description?: string
    variant?: AlertVariants['variant']
    dismissible?: boolean
}

export interface AlertItem extends Required<Omit<AlertOptions, 'dismissible'>> {
    dismissible: boolean
    createdAt: number
}
