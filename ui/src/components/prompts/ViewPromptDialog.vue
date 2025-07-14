<template>
    <Dialog v-model:open="open">
        <DialogContent class="max-w-4xl w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader>
                <DialogTitle>{{ prompt?.name }}</DialogTitle>
                <DialogDescription>
                    Created: {{ prompt ? formatDate(prompt.created_at) : '' }} |
                    Updated: {{ prompt ? formatDate(prompt.updated_at) : '' }}
                </DialogDescription>
            </DialogHeader>

            <div v-if="prompt" class="flex-1 overflow-hidden flex flex-col space-y-4 p-4">
                <div class="flex-shrink-0 grid grid-cols-2 gap-4 h-full">
                    <div class="flex flex-col min-h-0">
                        <Label>Prompt</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md overflow-auto max-h-[70vh]">
                            <pre class="whitespace-pre-wrap text-sm">{{ prompt.prompt }}</pre>
                        </div>
                    </div>

                    <div class="flex flex-col min-h-0">
                        <Label>JSON Schema Response</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md overflow-auto max-h-[70vh]">
                            <pre
                                class="whitespace-pre-wrap text-sm">{{ JSON.stringify(prompt.json_schema_response, null, 2) }}</pre>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button @click="$emit('close')">Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { type PromptResponse } from '@/services/definitions/prompt'
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

defineProps<{
    open: boolean
    prompt: PromptResponse | null
}>()

defineEmits<{
    (e: 'close'): void
}>()

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}
</script>
