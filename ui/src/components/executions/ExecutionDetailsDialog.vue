<template>
    <Dialog v-model:open="open">
        <DialogContent class="w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader class="flex-shrink-0 border-b pb-4">
                <DialogTitle>Execution Details</DialogTitle>
                <DialogDescription>
                    ID: {{ execution?.id }}
                </DialogDescription>
            </DialogHeader>

            <ExecutionDetailsView :execution="execution" />

            <DialogFooter class="flex-shrink-0 border-t pt-4">
                <Button @click="$emit('close')">Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExecutionResponse } from '@/services/definitions/execution'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import ExecutionDetailsView from './ExecutionDetailsView.vue'

interface Props {
    modelValue: boolean
    execution: ExecutionResponse | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue', 'close'])

const open = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})
</script>
