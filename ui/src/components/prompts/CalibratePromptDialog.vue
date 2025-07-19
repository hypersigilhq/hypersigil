<template>
    <Dialog :open="open" @update:open="onDialogOpenChange">
        <DialogContent class="max-w-4xl w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader>
                <DialogTitle>Calibrate Prompt</DialogTitle>
                <DialogDescription>
                    Generate adjustment suggestions based on selected comments
                </DialogDescription>
            </DialogHeader>

            <div class="flex-1 overflow-hidden flex flex-col space-y-4 p-4">
                <div v-if="loading" class="flex items-center justify-center py-8">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <div class="text-sm text-muted-foreground">Generating adjustment prompt...</div>
                    </div>
                </div>

                <div v-else-if="error" class="flex items-center justify-center py-8">
                    <div class="text-center text-red-600">
                        <div class="text-sm">{{ error }}</div>
                    </div>
                </div>

                <div v-else-if="adjustmentResult" class="flex-1 overflow-hidden flex flex-col space-y-4">
                    <div class="flex-shrink-0">
                        <div class="text-sm text-muted-foreground mb-2">
                            Processed {{ adjustmentResult.commentsProcessed }} comment{{
                                adjustmentResult.commentsProcessed !== 1 ? 's' : '' }}
                        </div>
                    </div>

                    <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
                        <div class="flex flex-col min-h-0">
                            <Label class="mb-2">Original Prompt</Label>
                            <div class="flex-1 p-3 bg-muted rounded-md overflow-auto">
                                <pre class="whitespace-pre-wrap text-sm">{{ adjustmentResult.originalPrompt }}</pre>
                            </div>
                        </div>

                        <div class="flex flex-col min-h-0">
                            <Label class="mb-2">Suggested Adjustment</Label>
                            <div class="flex-1 p-3 bg-muted rounded-md overflow-auto">
                                <pre class="whitespace-pre-wrap text-sm">{{ adjustmentResult.adjustmentPrompt }}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="$emit('close')">Close</Button>
                <Button v-if="adjustmentResult && !loading" @click="copyAdjustmentPrompt" class="ml-2">
                    Copy Adjustment
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { type GenerateAdjustmentResponse } from '@/services/definitions/prompt'
import { promptsApi } from '@/services/api-client'
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

const props = defineProps<{
    open: boolean
    promptId: string | null
    selectedCommentIds: string[]
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const adjustmentResult = ref<GenerateAdjustmentResponse | null>(null)

// Methods
const onDialogOpenChange = (open: boolean) => {
    if (!open) {
        emit('close')
    }
}

const generateAdjustment = async () => {
    if (!props.promptId || props.selectedCommentIds.length === 0) {
        error.value = 'No prompt or comments selected'
        return
    }

    loading.value = true
    error.value = null
    adjustmentResult.value = null

    try {
        const result = await promptsApi.generateAdjustment(props.promptId, {
            commentIds: props.selectedCommentIds
        })
        adjustmentResult.value = result
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to generate adjustment'
        console.error('Failed to generate adjustment:', err)
    } finally {
        loading.value = false
    }
}

const copyAdjustmentPrompt = async () => {
    if (adjustmentResult.value?.adjustmentPrompt) {
        try {
            await navigator.clipboard.writeText(adjustmentResult.value.adjustmentPrompt)
            // You could add a toast notification here if available
        } catch (err) {
            console.error('Failed to copy to clipboard:', err)
        }
    }
}

// Watch for dialog opening to trigger adjustment generation
watch(() => props.open, (newOpen) => {
    if (newOpen && props.promptId && props.selectedCommentIds.length > 0) {
        generateAdjustment()
    } else if (!newOpen) {
        // Reset state when dialog closes
        loading.value = false
        error.value = null
        adjustmentResult.value = null
    }
})
</script>

<style scoped>
/* Add any custom styles if needed */
</style>
