<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-4xl w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader>
                <DialogTitle>{{ item?.name || 'Unnamed Item' }}</DialogTitle>
                <DialogDescription>
                    Created: {{ item ? formatDate(item.created_at) : '' }} |
                    Updated: {{ item ? formatDate(item.updated_at) : '' }}
                </DialogDescription>
            </DialogHeader>

            <div v-if="item" class="flex-1 overflow-hidden flex flex-col space-y-4 p-4">
                <div class="flex-1 flex flex-col min-h-0">
                    <Label>Content</Label>
                    <div class="mt-1 p-3 bg-muted rounded-md overflow-auto flex-1">
                        <pre class="whitespace-pre-wrap text-sm">{{ item.content }}</pre>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button @click="closeDialog">Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

import type { TestDataItemResponse } from '../../services/definitions/test-data'

interface Props {
    open: boolean
    item?: TestDataItemResponse | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
    item: null
})

const emit = defineEmits<Emits>()

// Computed
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

// Utility functions
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Close dialog
const closeDialog = () => {
    isOpen.value = false
}
</script>
