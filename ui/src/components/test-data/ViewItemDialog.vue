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

            <div v-if="item" class="flex-1 overflow-hidden p-4">
                <!-- Two Column Layout -->
                <div class="grid grid-cols-2 gap-6 h-full">
                    <!-- Right Column: Content Section -->
                    <div class="flex flex-col min-h-0">
                        <Label>Content
                            <CopyToClipboard :text="item.content"></CopyToClipboard>
                        </Label>
                        <div class="mt-1 p-3 bg-muted rounded-md overflow-auto flex-1">
                            <pre class="whitespace-pre-wrap text-sm">{{ item.content }}</pre>
                        </div>
                    </div>
                    <!-- Left Column: Prompt Compilation Section (only for JSON mode) -->
                    <div v-if="group?.mode === 'json'" class="flex flex-col space-y-4">
                        <div class="space-y-4">
                            <div>
                                <PromptSelector v-model="selectedPromptId" label="Select Prompt to Compile"
                                    :nullOption="false" />
                                <div v-if="isCompiling" class="mt-2 text-sm text-muted-foreground">
                                    Compiling...
                                </div>
                            </div>

                            <!-- Compiled Prompt Result -->
                            <div v-if="compiledPrompt || compilationError"
                                class="space-y-2 flex-1 flex flex-col min-h-0">
                                <Label v-if="compiledPrompt">Compiled Prompt
                                    <CopyToClipboard :text="compiledPrompt"></CopyToClipboard>
                                </Label>
                                <Label v-if="compilationError" class="text-destructive">Compilation Error</Label>
                                <div class="p-3 bg-muted rounded-md overflow-auto flex-1">
                                    <pre v-if="compiledPrompt"
                                        class="whitespace-pre-wrap text-sm">{{ compiledPrompt }}</pre>
                                    <pre v-if="compilationError"
                                        class="whitespace-pre-wrap text-sm text-destructive">{{ compilationError }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- For non-JSON mode, show empty left column -->
                    <div v-else></div>
                </div>
            </div>

            <DialogFooter>
                <Button @click="closeDialog">Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

import type { TestDataGroupResponse, TestDataItemResponse } from '../../services/definitions/test-data'
import CopyToClipboard from '../ui/copy-to-clipboard/CopyToClipboard.vue'
import PromptSelector from '../prompts/PromptSelector.vue'
import { testDataApi } from '@/services/api-client'

interface Props {
    open: boolean
    item?: TestDataItemResponse | null
    group?: TestDataGroupResponse | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
    item: null
})

const emit = defineEmits<Emits>()

// Reactive state for prompt compilation
const selectedPromptId = ref<string>('')
const isCompiling = ref(false)
const compiledPrompt = ref<string>('')
const compilationError = ref<string>('')

// Computed
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

// Watch for dialog open/close to reset compilation state
watch(isOpen, (newValue) => {
    if (!newValue) {
        // Reset compilation state when dialog closes
        selectedPromptId.value = ''
        compiledPrompt.value = ''
        compilationError.value = ''
    }
})

// Watch for prompt selection changes and compile automatically
watch(selectedPromptId, (newPromptId) => {
    if (newPromptId && props.item?.id && props.group?.mode === 'json') {
        compilePrompt()
    }
})

// Compile prompt function
const compilePrompt = async () => {
    if (!selectedPromptId.value || !props.item?.id) return

    isCompiling.value = true
    compiledPrompt.value = ''
    compilationError.value = ''

    try {
        const response = await testDataApi.items.compilePrompt({
            promptId: selectedPromptId.value,
            testDataItemId: props.item.id
        })

        if (response.success && response.compiledPrompt) {
            compiledPrompt.value = response.compiledPrompt
        } else {
            compilationError.value = response.error || 'Unknown compilation error'
        }
    } catch (error) {
        compilationError.value = error instanceof Error ? error.message : 'Failed to compile prompt'
    } finally {
        isCompiling.value = false
    }
}

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
