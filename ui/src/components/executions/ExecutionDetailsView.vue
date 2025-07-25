<template>
    <div v-if="execution" class="flex-1 overflow-hidden flex flex-col space-y-4 px-4">
        <div class="flex-shrink-0 grid grid-cols-11 gap-2">
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
            <div>
                <Label>Prompt</Label>
                <div class="mt-1 text-sm" v-if="execution.prompt">
                    {{ execution.prompt?.name }} (#{{ execution.prompt?.version }})
                </div>
                <Badge :variant="'secondary'" class="flex items-center gap-1" v-if="execution.prompt_text">
                    Custom
                </Badge>
            </div>
            <div>
                <Label>Origin</Label>
                <div class="mt-1 text-sm">
                    {{ execution.origin }}
                </div>
            </div>
            <div>
                <Label>Starred</Label>
                <div class="mt-1 text-sm">
                    <template v-if="execution.starred">
                        <Star :color="'gold'" :fill="'gold'" @click="toggleStar(false)" />
                    </template>
                    <template v-else>
                        <Star :color="'black'" @click="toggleStar(true)" />
                    </template>
                </div>
            </div>
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
            <div class="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-h-32 overflow-auto">
                <pre class="whitespace-pre-wrap text-sm text-destructive">{{ execution.error_message }}</pre>
            </div>
        </div>

        <div v-if="execution.result_valid === false" class="flex-shrink-0">
            <Label>Result validation error</Label>
            <div class="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-h-32 overflow-auto">
                <pre class="whitespace-pre-wrap text-sm text-destructive">{{
                    execution.result_validation_message }}</pre>
            </div>
        </div>

        <!-- Column visibility controls -->
        <div class="flex-shrink-0 flex items-center">
            <Label class="text-base font-semibold">Content View</Label>
            <div class="flex items-center space-x-6 ml-5">
                <div class="flex items-center space-x-2">
                    <Label for="user-input-switch" class="text-sm font-medium">User Input</Label>
                    <Switch id="user-input-switch" :model-value="showUserInput"
                        @update:model-value="(value: boolean) => showUserInput = value" />
                </div>
                <div class="flex items-center space-x-2">
                    <Label for="prompt-switch" class="text-sm font-medium">Prompt</Label>
                    <Switch id="prompt-switch" :model-value="showPrompt" @update:model-value="onPromptSwitchChange" />
                </div>
                <div class="flex items-center space-x-2">
                    <Label for="comments-switch" class="text-sm font-medium">Comments ({{ comments.length }})</Label>
                    <Switch id="comments-switch" :model-value="showComments"
                        @update:model-value="onCommentsSwitchChange" />
                </div>
                <div class="flex items-center space-x-2">
                    <Label for="comments-switch" class="text-sm font-medium">Execution options</Label>
                    <Switch id="comments-switch" :model-value="showExecutionOptions"
                        @update:model-value="(v: boolean) => showExecutionOptions = v" />
                </div>
            </div>
        </div>

        <div class="flex-1 gap-4 min-h-0" :class="gridClasses">
            <!-- User Input Column -->
            <div v-if="showUserInput" class="flex flex-col min-h-0">
                <div class="flex items-center justify-between mb-2">
                    <Label>User Input
                        <CopyToClipboard :text="execution.user_input"></CopyToClipboard>
                    </Label>
                </div>
                <div class="flex-1 p-3 bg-muted rounded-md overflow-hidden">
                    <pre class="whitespace-pre-wrap text-sm h-full overflow-auto">{{ execution.user_input }}</pre>
                </div>
            </div>

            <!-- Prompt Column -->
            <div v-if="showPrompt" class="flex flex-col min-h-0">
                <div class="flex items-center justify-between mb-2">
                    <Label>Prompt
                        <CopyToClipboard v-if="prompt" :text="prompt?.prompt || execution.prompt_text || ''">
                        </CopyToClipboard>
                    </Label>
                </div>
                <div class="flex-1 p-2 bg-muted rounded-md overflow-hidden">
                    <div v-if="promptLoading" class="flex items-center justify-center h-full">
                        <span class="text-sm text-muted-foreground">Loading prompt...</span>
                    </div>
                    <div v-else-if="promptError" class="text-destructive text-sm">
                        {{ promptError }}
                    </div>
                    <div v-else-if="prompt || execution.prompt_text" class="h-full">
                        <div class="text-sm font-semibold mb-2" v-if="prompt">Prompt name: {{ prompt.name }}</div>
                        <pre class="whitespace-pre-wrap text-[13px] h-[calc(100%-2rem)] overflow-auto">{{ prompt?.prompt ||
                            execution.prompt_text || '' }}</pre>
                    </div>
                    <div v-else class="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No prompt available
                    </div>
                </div>
            </div>

            <!-- Result Column (Always visible) -->
            <div v-if="execution.result" class="flex flex-col min-h-0">
                <Label class="mb-2">Result
                    <CopyToClipboard :text="execution.result"></CopyToClipboard>
                </Label>
                <div v-if="showComments" class="flex-1 overflow-hidden">
                    <TextCommentable :content="execution.result" :initial-comments="comments"
                        @comment-added="commentAdded" @comment-deleted="commentDeleted"
                        content-class="whitespace-pre-wrap text-sm h-full overflow-auto">
                        <template #default="{ renderedContent, contentClass }">
                            <pre v-html="renderedContent" :class="contentClass"></pre>
                        </template>
                    </TextCommentable>
                </div>
                <div v-else class="flex-1 p-3 bg-muted rounded-md overflow-hidden">
                    <pre class="whitespace-pre-wrap text-sm h-full overflow-auto">{{ execution.result }}</pre>
                </div>
            </div>
        </div>

        <div v-if="execution.options && showExecutionOptions" class="flex-shrink-0">
            <Label>Execution Options</Label>
            <div class="mt-1 p-3 bg-muted rounded-md max-h-32 overflow-auto">
                <pre class="text-sm">{{ JSON.stringify(execution.options, null, 2) }}</pre>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { ExecutionResponse } from '@/services/definitions/execution'
import type { PromptResponse } from '@/services/definitions/prompt'
import type { Comment } from '@/components/ui/text-commentable/types'
import { executionsApi, promptsApi, commentsApi } from '@/services/api-client'

import { Star } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { TextCommentable } from '@/components/ui/text-commentable'
import CopyToClipboard from '@/components/ui/copy-to-clipboard/CopyToClipboard.vue'

interface Props {
    execution: ExecutionResponse | null
}

const props = defineProps<Props>()

const prompt = ref<PromptResponse | null>(null)
const promptLoading = ref(false)
const promptError = ref<string | null>(null)

// Comments state
const comments = ref<Comment[]>([])
const commentsLoading = ref(false)
const commentsError = ref<string | null>(null)

// Column visibility state
const showUserInput = ref(true)
const showPrompt = ref(false)
const showComments = ref(true)
const showExecutionOptions = ref(false)

// Computed property for dynamic grid classes
const gridClasses = computed(() => {
    const visibleColumns = [
        showUserInput.value,
        showPrompt.value,
        true // Result is always visible
    ].filter(Boolean).length

    const baseClasses = 'grid min-h-0'

    switch (visibleColumns) {
        case 1:
            return `${baseClasses} grid-cols-1`
        case 2:
            return `${baseClasses} grid-cols-1 lg:grid-cols-2`
        case 3:
            return `${baseClasses} grid-cols-1 lg:grid-cols-3`
        default:
            return `${baseClasses} grid-cols-1`
    }
})

// Function to handle prompt switch change
const onPromptSwitchChange = async (checked: boolean) => {
    showPrompt.value = checked
    if (checked && !prompt.value && props.execution?.prompt_id) {
        await fetchPrompt()
    }
}

// Function to handle comments switch change
const onCommentsSwitchChange = async (checked: boolean) => {
    showComments.value = checked
    if (checked && comments.value.length === 0 && props.execution?.id) {
        await fetchComments()
    }
}

const toggleStar = async (val: boolean) => {
    if (!props.execution) {
        return
    }
    await executionsApi.update(props.execution.id, { starred: val })
    props.execution.starred = val
}

const fetchPrompt = async () => {
    if (!props.execution?.prompt_id) return

    try {
        promptLoading.value = true
        promptError.value = null
        prompt.value = await promptsApi.getById(props.execution.prompt_id)
    } catch (error) {
        promptError.value = error instanceof Error ? error.message : 'Failed to load prompt'
    } finally {
        promptLoading.value = false
    }
}

const fetchComments = async () => {
    if (!props.execution?.id) return

    try {
        commentsLoading.value = true
        commentsError.value = null
        const apiComments = await commentsApi.list({ query: { execution_id: props.execution.id } })

        // Transform API comments to TextCommentable format
        comments.value = apiComments
            .filter(comment => comment.data.type === 'execution')
            .map((comment): Comment => {
                if (comment.data.type === 'execution') {
                    return {
                        id: comment.id,
                        text: comment.text,
                        selectedText: comment.data.selected_text,
                        startOffset: comment.data.start_offset,
                        endOffset: comment.data.end_offset,
                        unixTimestampMs: new Date(comment.created_at).getTime()
                    }
                }
                else {
                    throw new Error('invalid type??')
                }
            }
            )
    } catch (error) {
        commentsError.value = error instanceof Error ? error.message : 'Failed to load comments'
    } finally {
        commentsLoading.value = false
    }
}

// Reset state when execution changes
watch(() => props.execution, async () => {
    prompt.value = null
    promptError.value = null
    comments.value = []
    commentsError.value = null

    if (showPrompt.value) {
        await fetchPrompt()
    }

    await onLoad()
})

const onLoad = async () => {
    await fetchComments()
    showUserInput.value = !!props.execution?.user_input
    showPrompt.value = !!props.execution?.prompt_text
}

onMounted(async () => {
    await onLoad()
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

// Comment handling functions
const commentAdded = async (commentData: { text: string; selectedText: string; startOffset: number; endOffset: number }) => {
    if (!props.execution) return

    try {
        const createCommentRequest = {
            text: commentData.text,
            data: {
                type: 'execution' as const,
                selected_text: commentData.selectedText,
                start_offset: commentData.startOffset,
                end_offset: commentData.endOffset
            },
            execution_id: props.execution.id,
            prompt_id: props.execution.prompt_id
        }

        await commentsApi.create(createCommentRequest)
        // Refresh comments to show the new comment
        await fetchComments()
    } catch (error) {
        console.error('Failed to create comment:', error)
        // You might want to show a toast notification here
    }
}

const commentDeleted = async (commentId: string) => {
    try {
        await commentsApi.delete(commentId)
        // Refresh comments to remove the deleted comment
        await fetchComments()
    } catch (error) {
        console.error('Failed to delete comment:', error)
        // You might want to show a toast notification here
    }
}
</script>
