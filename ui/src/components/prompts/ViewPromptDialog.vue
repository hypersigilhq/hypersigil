<template>
    <Dialog :open="open" @update:open="onDialogOpenChange">
        <DialogContent class="max-w-4xl w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader>
                <div class="flex items-center justify-between">
                    <div>
                        <DialogTitle>{{ prompt?.name }}</DialogTitle>
                        <DialogDescription>
                            Created: {{ prompt ? formatDate(prompt.created_at) : '' }} |
                            Updated: {{ prompt ? formatDate(prompt.updated_at) : '' }}
                        </DialogDescription>
                    </div>

                    <!-- Version Navigation -->
                    <div v-if="prompt && prompt.versions.length > 1" class="flex items-center space-x-2">
                        <Button variant="outline" size="sm" :disabled="!canGoPrevious" @click="goToPreviousVersion">
                            <ChevronLeft class="w-4 h-4" />
                        </Button>

                        <div class="flex items-center space-x-1 text-sm text-muted-foreground">
                            <span>Version</span>
                            <span class="font-medium">{{ currentDisplayVersion?.version }}</span>
                            <span>of</span>
                            <span class="font-medium">{{ prompt.versions.length }}</span>
                            <span v-if="currentDisplayVersion?.version === prompt.current_version"
                                class="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                                Current
                            </span>
                        </div>

                        <Button variant="outline" size="sm" :disabled="!canGoNext" @click="goToNextVersion"
                            v-tooltip.bottom="'Next version (→)'">
                            <ChevronRight class="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogHeader>

            <div v-if="prompt && currentDisplayVersion" class="flex-1 overflow-hidden flex flex-col space-y-4 p-4">
                <div class="flex-shrink-0 grid grid-cols-2 gap-4 h-full">
                    <div class="flex flex-col min-h-0">
                        <div class="flex items-center justify-between mb-1">
                            <Label>Prompt</Label>
                            <div class="text-xs text-muted-foreground">
                                {{ formatDate(currentDisplayVersion.created_at) }}
                            </div>
                        </div>
                        <div class="mt-1 p-3 bg-muted rounded-md overflow-auto max-h-[70vh]">
                            <pre class="whitespace-pre-wrap text-sm">{{ currentDisplayVersion.prompt }}</pre>
                        </div>
                    </div>

                    <div class="flex flex-col min-h-0">
                        <Label>JSON Schema Response</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md overflow-auto max-h-[70vh]">
                            <pre
                                class="whitespace-pre-wrap text-sm">{{ JSON.stringify(currentDisplayVersion.json_schema_response || {}, null, 2) }}</pre>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { type PromptResponse, type PromptVersion } from '@/services/definitions/prompt'
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
    prompt: PromptResponse | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

// Version navigation state
const selectedVersionIndex = ref(0)

// Computed properties
const sortedVersions = computed(() => {
    if (!props.prompt?.versions) return []
    return [...props.prompt.versions].sort((a, b) => a.version - b.version)
})

const currentDisplayVersion = computed(() => {
    if (!sortedVersions.value.length) return null
    return sortedVersions.value[selectedVersionIndex.value] || null
})

const canGoPrevious = computed(() => selectedVersionIndex.value > 0)
const canGoNext = computed(() => selectedVersionIndex.value < sortedVersions.value.length - 1)

// Methods
const goToPreviousVersion = () => {
    if (canGoPrevious.value) {
        selectedVersionIndex.value--
    }
}

const goToNextVersion = () => {
    if (canGoNext.value) {
        selectedVersionIndex.value++
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPreviousVersion()
    } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNextVersion()
    }
}

const onDialogOpenChange = (open: boolean) => {
    if (!open) {
        emit('close')
    }
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Reset to current version when prompt changes
watch(() => props.prompt, (newPrompt) => {
    if (newPrompt?.versions) {
        // Find the index of the current version
        const currentVersionIndex = sortedVersions.value.findIndex(
            v => v.version === newPrompt.current_version
        )
        selectedVersionIndex.value = currentVersionIndex >= 0 ? currentVersionIndex : sortedVersions.value.length - 1
    } else {
        selectedVersionIndex.value = 0
    }
}, { immediate: true })
</script>
