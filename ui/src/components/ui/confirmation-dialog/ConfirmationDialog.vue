<template>
    <Dialog :open="isOpen" @update:open="handleOpenChange">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-3">
                    <component :is="iconComponent" v-if="iconComponent" :class="iconClasses" class="h-5 w-5" />
                    {{ title }}
                </DialogTitle>
                <DialogDescription>
                    {{ message }}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter class="gap-2">
                <Button variant="outline" @click="handleCancel">
                    {{ cancelText }}
                </Button>
                <Button :variant="variant === 'destructive' ? 'destructive' : 'default'" @click="handleConfirm">
                    {{ confirmText }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, HelpCircle, Info, XCircle } from 'lucide-vue-next'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ConfirmationOptions } from './index'

interface Props {
    open: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'destructive'
    icon?: 'warning' | 'question' | 'info' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Confirm Action',
    message: 'Are you sure you want to continue?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    icon: 'question',
})

const emit = defineEmits<{
    'update:open': [value: boolean]
    confirm: []
    cancel: []
}>()

const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

const iconComponent = computed(() => {
    switch (props.icon) {
        case 'warning':
            return AlertTriangle
        case 'question':
            return HelpCircle
        case 'info':
            return Info
        case 'error':
            return XCircle
        default:
            return null
    }
})

const iconClasses = computed(() => {
    switch (props.icon) {
        case 'warning':
            return 'text-yellow-600 dark:text-yellow-400'
        case 'error':
            return 'text-red-600 dark:text-red-400'
        case 'info':
            return 'text-blue-600 dark:text-blue-400'
        case 'question':
        default:
            return 'text-gray-600 dark:text-gray-400'
    }
})

const handleOpenChange = (open: boolean) => {
    if (!open) {
        handleCancel()
    }
}

const handleConfirm = () => {
    emit('confirm')
    isOpen.value = false
}

const handleCancel = () => {
    emit('cancel')
    isOpen.value = false
}
</script>
