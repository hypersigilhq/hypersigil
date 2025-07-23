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

            <div v-if="currentDisplayVersion" class="flex-1 overflow-hidden flex flex-col space-y-4 p-4">
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
                        <div class="my-2" v-if="currentDisplayVersion.json_schema_response">
                            <Label>JSON Schema Response
                                <Switch :model-value="jsonSchemaOutputVisible"
                                    @update:model-value="(v: boolean) => jsonSchemaOutputVisible = v" />
                            </Label>
                            <div v-if="jsonSchemaOutputVisible"
                                class="mt-1 p-3 bg-muted rounded-md overflow-auto max-h-[70vh]">
                                <pre
                                    class="whitespace-pre-wrap text-sm">{{ JSON.stringify(currentDisplayVersion.json_schema_response || {}, null, 2) }}</pre>
                            </div>
                        </div>
                        <div class="my-2" v-if="currentDisplayVersion.json_schema_input">
                            <Label>JSON Schema Input
                                <Switch :model-value="jsonSchemaInputVisible"
                                    @update:model-value="(v: boolean) => jsonSchemaInputVisible = v" />
                            </Label>
                            <div v-if="jsonSchemaInputVisible"
                                class="mt-1 p-3 bg-muted rounded-md overflow-auto max-h-[70vh]">
                                <pre
                                    class="whitespace-pre-wrap text-sm">{{ JSON.stringify(currentDisplayVersion.json_schema_input || {}, null, 2) }}</pre>
                            </div>
                        </div>
                        <div class="flex items-center justify-between my-2">
                            <Label>Comments</Label>
                            <div class="flex items-center space-x-2">
                                <Button :disabled="!hasSelectedComments" size="sm" @click="openCalibrateDialog"
                                    class="text-xs">
                                    Calibrate prompt
                                </Button>
                                <div class="text-xs text-muted-foreground">
                                    {{ comments.length }} comment{{ comments.length !== 1 ? 's' : '' }}
                                </div>
                            </div>
                        </div>
                        <div class="p-3 bg-muted rounded-md overflow-auto">
                            <div v-if="loadingComments" class="flex items-center justify-center py-4">
                                <div class="text-sm text-muted-foreground">Loading comments...</div>
                            </div>
                            <div v-else-if="comments.length === 0" class="flex items-center justify-center py-4">
                                <div class="text-sm text-muted-foreground">No comments available</div>
                            </div>
                            <div v-else class="space-y-3">
                                <div v-for="comment in comments" :key="comment.id"
                                    class="flex items-start space-x-3 p-2 bg-background rounded border">
                                    <Checkbox :checked="selectedComments.has(comment.id)"
                                        @update:model-value="(v: any) => toggleCommentSelection(comment.id, v)"
                                        class="mt-0.5" />
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm break-words bg-slate-200 p-2 italic"
                                            v-if="comment.data.type === 'execution'">{{
                                                comment.data.selected_text }}
                                        </p>
                                        <p class="text-sm break-words pt-2">{{ comment.text }}</p>
                                        <div class="flex items-center space-x-2 mt-1">
                                            <div class="text-xs text-muted-foreground">
                                                {{ formatDate(comment.created_at) }}
                                            </div>
                                            <div v-if="comment.data.type === 'execution'"
                                                class="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                                Execution {{ comment.execution_id }}
                                            </div>
                                            <div v-else class="px-1.5 py-0.5 bg-gray-100 text-gray-800 text-xs rounded">
                                                General
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button @click="$emit('close')">Close</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <!-- Calibrate Prompt Dialog -->
    <CalibratePromptDialog :open="showCalibrateDialog" :prompt-id="prompt?.id || null"
        :selected-comment-ids="selectedCommentIds" @close="closeCalibrateDialog" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { type PromptResponse, type PromptVersion } from '@/services/definitions/prompt'
import { type CommentResponse } from '@/services/definitions/comment'
import { commentsApi } from '@/services/api-client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import CalibratePromptDialog from './CalibratePromptDialog.vue'
import Switch from '../ui/switch/Switch.vue'

const props = defineProps<{
    open: boolean
    prompt: PromptResponse | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

// Version navigation state
const selectedVersionIndex = ref(0)

// Comments state
const comments = ref<CommentResponse[]>([])
const loadingComments = ref(false)
const selectedComments = ref<Set<string>>(new Set())

// Calibration dialog state
const showCalibrateDialog = ref(false)
const jsonSchemaInputVisible = ref(true)
const jsonSchemaOutputVisible = ref(true)

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

const hasSelectedComments = computed(() => selectedComments.value.size > 0)
const selectedCommentIds = computed(() => Array.from(selectedComments.value))

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

// Comments methods
const fetchComments = async (promptId: string) => {
    if (!promptId) return

    loadingComments.value = true
    try {
        comments.value = await commentsApi.list({
            query: { prompt_id: promptId }
        })
    } catch (error) {
        console.error('Failed to fetch comments:', error)
        comments.value = []
    } finally {
        loadingComments.value = false
    }
}

const toggleCommentSelection = (commentId: string, checked: boolean) => {
    console.log(commentId, checked)
    if (checked) {
        selectedComments.value.add(commentId)
    } else {
        selectedComments.value.delete(commentId)
    }
}

// Calibration methods
const openCalibrateDialog = () => {
    showCalibrateDialog.value = true
}

const closeCalibrateDialog = () => {
    showCalibrateDialog.value = false
}

watch(() => props.open, (newOpen) => {
    if (newOpen) {
        window.addEventListener('keydown', handleKeydown)
    } else {
        window.removeEventListener('keydown', handleKeydown)
    }
})

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

    // Fetch comments when prompt changes
    if (newPrompt?.id) {
        fetchComments(newPrompt.id)
    } else {
        comments.value = []
        selectedComments.value.clear()
    }
}, { immediate: true })

// Fetch comments when dialog opens
watch(() => props.open, (newOpen) => {
    if (newOpen && props.prompt?.id) {
        fetchComments(props.prompt.id)
    } else if (!newOpen) {
        // Clear selection when dialog closes
        selectedComments.value.clear()
    }
})
</script>
