<template>
    <div :class="cn(alertVariants({ variant }), 'relative')" role="alert">
        <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
                <CheckCircle v-if="variant === 'success'" class="h-5 w-5" />
                <AlertTriangle v-else-if="variant === 'warning'" class="h-5 w-5" />
                <XCircle v-else-if="variant === 'error'" class="h-5 w-5" />
            </div>
            <div class="flex-1 min-w-0">
                <div v-if="title" class="font-medium text-sm">
                    {{ title }}
                </div>
                <div v-if="description" class="text-sm" :class="title ? 'mt-1' : ''">
                    {{ description }}
                </div>
            </div>
            <Button v-if="dismissible" variant="ghost" size="icon" @click="$emit('dismiss')"
                class="h-6 w-6 shrink-0 hover:bg-black/10 dark:hover:bg-white/10" aria-label="Close">
                <X class="h-4 w-4" />
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { alertVariants, type AlertVariants } from './index'

interface Props {
    title?: string
    description?: string
    variant?: AlertVariants['variant']
    dismissible?: boolean
}

defineProps<Props>()

defineEmits<{
    dismiss: []
}>()
</script>
