<template>
    <div :class="cn(toastVariants({ variant }), 'max-w-[420px]')" role="alert"
        :aria-live="variant === 'error' ? 'assertive' : 'polite'" :aria-atomic="true" @click.stop>
        <div class="grid gap-1">
            <div v-if="title" class="text-sm font-semibold">
                {{ title }}
            </div>
            <div v-if="description" class="text-sm opacity-90">
                {{ description }}
            </div>
        </div>
        <div v-if="action || dismissible" class="flex items-center gap-2">
            <Button v-if="action" variant="outline" size="sm" @click="action.onClick" class="h-8 px-3">
                {{ action.label }}
            </Button>
            <Button v-if="dismissible" variant="ghost" size="icon" @click="$emit('dismiss')" class="h-6 w-6 shrink-0"
                aria-label="Close">
                <X class="h-4 w-4" />
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toastVariants, type ToastVariants } from './index'

interface Props {
    title?: string
    description?: string
    variant?: ToastVariants['variant']
    dismissible?: boolean
    action?: {
        label: string
        onClick: () => void
    }
}

defineProps<Props>()

defineEmits<{
    dismiss: []
}>()
</script>
