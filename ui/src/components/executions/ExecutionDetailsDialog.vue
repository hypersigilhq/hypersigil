<template>
    <Dialog v-model:open="open">
        <DialogContent class="w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader class="flex-shrink-0 border-b pb-4">
                <DialogTitle>Execution Details</DialogTitle>
                <DialogDescription>
                    ID: {{ execution?.id }}
                </DialogDescription>
            </DialogHeader>

            <div v-if="execution" class="flex-1 overflow-hidden flex flex-col space-y-4 p-4">
                <div class="flex-shrink-0 grid grid-cols-2 gap-4">
                    <div>
                        <Label>Status</Label>
                        <div class="mt-1">
                            <Badge :variant="getStatusVariant(execution.status)" class="flex items-center gap-1 w-fit">
                                <div v-if="execution.status === 'running'"
                                    class="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                {{ execution.status }}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <Label>Provider/Model</Label>
                        <div class="mt-1 text-sm">
                            {{ execution.provider }}:{{ execution.model }}
                        </div>
                    </div>
                </div>

                <div class="flex-shrink-0 grid grid-cols-5 gap-2">
                    <div>
                        <Label>Created</Label>
                        <div class="mt-1 text-sm">{{ formatDate(execution.created_at) }}</div>
                    </div>
                    <div>
                        <Label>Started</Label>
                        <div class="mt-1 text-sm">{{ execution.started_at ?
                            formatDate(execution.started_at) : '-' }}</div>
                    </div>
                    <div>
                        <Label>Completed</Label>
                        <div class="mt-1 text-sm">{{ execution.completed_at ?
                            formatDate(execution.completed_at) : '-' }}</div>
                    </div>
                    <div>
                        <Label>Duration</Label>
                        <div class="mt-1 text-sm">{{ formatDuration(execution) }}</div>
                    </div>
                    <div>
                        <Label>Input / Output tokens used</Label>
                        <div class="mt-1 text-sm">{{ execution.input_tokens_used }} / {{
                            execution.output_tokens_used }}</div>
                    </div>
                </div>

                <div v-if="execution.error_message" class="flex-shrink-0">
                    <Label>Error Message</Label>
                    <div
                        class="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-h-32 overflow-auto">
                        <pre class="whitespace-pre-wrap text-sm text-destructive">{{ execution.error_message }}</pre>
                    </div>
                </div>

                <div v-if="!execution.result_valid" class="flex-shrink-0">
                    <Label>Result validation error</Label>
                    <div
                        class="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-h-32 overflow-auto">
                        <pre class="whitespace-pre-wrap text-sm text-destructive">{{
                            execution.result_validation_message }}</pre>
                    </div>
                </div>

                <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                    <div class="flex flex-col min-h-0">
                        <Label class="mb-2">User Input</Label>
                        <div class="flex-1 p-3 bg-muted rounded-md overflow-hidden">
                            <pre class="whitespace-pre-wrap text-sm h-full overflow-auto">{{ execution.user_input }}
                    </pre>
                        </div>
                    </div>

                    <div v-if="execution.result" class="flex flex-col min-h-0">
                        <Label class="mb-2">Result</Label>
                        <div class="flex-1 p-3 bg-muted rounded-md overflow-hidden">
                            <pre class="whitespace-pre-wrap text-sm h-full overflow-auto">{{
                                JSON.stringify(JSON.parse(execution.result), null, "\t") }}</pre>
                        </div>
                    </div>
                </div>

                <div v-if="execution.options" class="flex-shrink-0">
                    <Label>Execution Options</Label>
                    <div class="mt-1 p-3 bg-muted rounded-md max-h-32 overflow-auto">
                        <pre class="text-sm">{{ JSON.stringify(execution.options, null, 2) }}</pre>
                    </div>
                </div>
            </div>

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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

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

// Utility functions (moved from ExecutionsTable)
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const formatDuration = (execution: ExecutionResponse) => {
    if (!execution.started_at || !execution.completed_at) {
        return '-'
    }

    const startTime = new Date(execution.started_at).getTime()
    let endTime: number

    if (execution.completed_at) {
        // Execution is completed
        endTime = new Date(execution.completed_at).getTime()
    } else if (execution.status === 'running') {
        // Execution is still running, use current time
        endTime = Date.now()
    } else {
        // Execution failed or was cancelled without completion
        return '-'
    }

    const durationMs = endTime - startTime
    return durationMs.toLocaleString() + 'ms'
}

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'pending':
            return 'secondary'
        case 'running':
            return 'default'
        case 'completed':
            return 'default'
        case 'failed':
            return 'destructive'
        default:
            return 'secondary'
    }
}
</script>
