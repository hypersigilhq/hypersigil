<template>
    <div class="h-full flex flex-col">
        <!-- Header -->
        <div class="flex-shrink-0 p-4 border-b">
            <h1 class="text-2xl font-bold">Execution Bundles</h1>
            <p class="text-muted-foreground">Browse execution bundles and their results</p>
        </div>

        <!-- Three-column layout -->
        <div ref="containerRef" class="flex-1 flex min-h-0 relative">
            <!-- Column 1: Execution Bundles List -->
            <div ref="bundlesColumn" :style="{ width: `${bundlesColumnWidth}px` }"
                class="border-r flex flex-col min-h-0">
                <div class="flex-shrink-0 p-4 border-b">
                    <h2 class="font-semibold mb-2">Execution Bundles</h2>
                    <Input v-model="searchQuery" placeholder="Search bundles..." class="w-full"
                        @input="debouncedSearch" />
                </div>

                <div class="flex-1 overflow-auto">
                    <!-- Loading state -->
                    <div v-if="bundlesLoading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>

                    <!-- Error state -->
                    <div v-else-if="bundlesError" class="p-4 text-center text-destructive">
                        {{ bundlesError }}
                        <Button @click="loadBundles" variant="outline" size="sm" class="mt-2">
                            Retry
                        </Button>
                    </div>

                    <!-- Empty state -->
                    <div v-else-if="bundles.length === 0" class="p-4 text-center text-muted-foreground">
                        No execution bundles found
                    </div>

                    <!-- Bundles list -->
                    <div v-else class="p-2">
                        <div v-for="bundle in bundles" :key="bundle.id" @click="selectBundle(bundle)" :class="[
                            'p-3 rounded-md cursor-pointer border mb-2 transition-colors',
                            selectedBundle?.id === bundle.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted border-border'
                        ]">
                            <div class="font-medium text-sm">
                                {{ bundle.id.substring(0, 8) }}...
                            </div>
                            <div class="text-xs text-muted-foreground mt-1">
                                {{ bundle.execution_ids.length }} executions
                            </div>
                            <div class="text-xs text-muted-foreground">
                                {{ formatDate(bundle.created_at) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Resizer for first column -->
            <div ref="bundlesResizer" @mousedown="startResize($event, 'bundles')"
                class=" top-0 bottom-0 w-1 right-0 cursor-col-resize hover:bg-primary/20 z-10"></div>

            <!-- Column 2: Executions List -->
            <div ref="executionsColumn" :style="{ width: `${executionsColumnWidth}px` }"
                class="border-r flex flex-col min-h-0">
                <div class="flex-shrink-0 p-4 border-b">
                    <h2 class="font-semibold">
                        {{ selectedBundle ? 'Executions' : 'Select a bundle' }}
                    </h2>
                    <p v-if="selectedBundle" class="text-sm text-muted-foreground">
                        {{ selectedBundle.execution_ids.length }} executions in bundle
                    </p>
                </div>

                <div class="flex-1 overflow-auto">
                    <!-- No bundle selected -->
                    <div v-if="!selectedBundle" class="p-4 text-center text-muted-foreground">
                        Select an execution bundle to view its executions
                    </div>

                    <!-- Loading state -->
                    <div v-else-if="executionsLoading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>

                    <!-- Error state -->
                    <div v-else-if="executionsError" class="p-4 text-center text-destructive">
                        {{ executionsError }}
                        <Button @click="loadExecutions" variant="outline" size="sm" class="mt-2">
                            Retry
                        </Button>
                    </div>

                    <!-- Executions list -->
                    <div v-else class="p-2">
                        <div v-for="(execution, index) in executions" :key="execution.id" :data-index="index"
                            @click="selectExecution(execution)" :class="[
                                'p-3 rounded-md cursor-pointer border mb-2 transition-colors',
                                selectedExecution?.id === execution.id
                                    ? 'bg-primary/10 border-primary'
                                    : 'hover:bg-muted border-border',
                                focusedExecutionIndex === index
                                    ? 'ring-2 ring-primary/50'
                                    : ''
                            ]">
                            <div class="flex items-center justify-between mb-2">
                                <div class="font-medium text-sm font-mono">
                                    {{ execution.id.substring(0, 8) }}...
                                </div>
                                <Badge :variant="getStatusVariant(execution.status)" class="text-xs">
                                    {{ execution.status }}
                                </Badge>
                                <Badge v-if="execution.result_valid !== undefined"
                                    :variant="getResultValidVariant(execution.result_valid)" class="text-xs">
                                    {{ execution.result_valid ? 'valid' : 'invalid' }}
                                </Badge>
                            </div>

                            <div class="text-xs text-muted-foreground mb-1">
                                {{ execution.provider }}:{{ execution.model }}
                            </div>
                            <div class="text-xs text-muted-foreground">
                                {{ formatDuration(execution) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Resizer for second column -->
            <div ref="executionsResizer" @mousedown="startResize($event, 'executions')"
                class=" top-0 bottom-0 w-1 right-0 cursor-col-resize hover:bg-primary/20 z-10"></div>

            <!-- Column 3: Execution Results -->
            <div class="flex-1 flex flex-col min-h-0">
                <!-- Rest of the template remains the same -->
                <div class="flex-shrink-0 p-4 border-b">
                    <h2 class="font-semibold">
                        {{ selectedExecution ? 'Execution Results' : 'Select an execution' }}
                    </h2>
                    <p v-if="selectedExecution" class="text-sm text-muted-foreground">
                        {{ selectedExecution.id }}
                    </p>
                </div>

                <!-- Execution details section remains the same -->
                <div class="flex-1 overflow-auto">
                    <!-- No execution selected -->
                    <div v-if="!selectedExecution" class="p-4 text-center text-muted-foreground">
                        Select an execution to view its results
                    </div>

                    <!-- Execution details -->
                    <div v-else class="p-4 space-y-4">
                        <!-- Status and metadata section remains the same -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <Label class="text-xs font-medium text-muted-foreground">Status</Label>
                                <div class="mt-1">
                                    <Badge :variant="getStatusVariant(selectedExecution.status)">
                                        {{ selectedExecution.status }}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <Label class="text-xs font-medium text-muted-foreground">Provider/Model</Label>
                                <div class="mt-1 text-sm">
                                    {{ selectedExecution.provider }}:{{ selectedExecution.model }}
                                </div>
                            </div>
                            <div>
                                <Label class="text-xs font-medium text-muted-foreground">Duration</Label>
                                <div class="mt-1 text-sm">
                                    {{ formatDuration(selectedExecution) }}
                                </div>
                            </div>
                            <div v-if="selectedExecution.input_tokens_used || selectedExecution.output_tokens_used">
                                <Label class="text-xs font-medium text-muted-foreground">Tokens Used</Label>
                                <div class="mt-1 text-sm">
                                    {{ selectedExecution.input_tokens_used || 0 }} / {{
                                        selectedExecution.output_tokens_used || 0 }}
                                </div>
                            </div>
                        </div>


                        <div v-if="selectedExecution.error_message" class="flex-shrink-0">
                            <Label>Error Message</Label>
                            <div
                                class="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-h-32 overflow-auto">
                                <pre
                                    class="whitespace-pre-wrap text-sm text-destructive">{{ selectedExecution.error_message }}</pre>
                            </div>
                        </div>

                        <div v-if="!selectedExecution.result_valid" class="flex-shrink-0">
                            <Label>Result validation error</Label>
                            <div
                                class="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md max-h-32 overflow-auto">
                                <pre class="whitespace-pre-wrap text-sm text-destructive">{{
                                    selectedExecution.result_validation_message }}</pre>
                            </div>
                        </div>

                        <!-- Remaining sections remain the same -->
                        <div>
                            <Label class="text-xs font-medium text-muted-foreground">User Input</Label>
                            <div class="mt-1 p-3 bg-muted rounded-md text-sm max-h-32 overflow-auto">
                                <pre class="whitespace-pre-wrap">{{ selectedExecution.user_input }}</pre>
                            </div>
                        </div>

                        <div v-if="selectedExecution.result">
                            <Label class="text-xs font-medium text-muted-foreground">Result</Label>
                            <div class="mt-1 p-3 bg-muted rounded-md text-sm max-h-96 overflow-auto">
                                <pre class="whitespace-pre-wrap">{{ formatJsonResult(selectedExecution.result) }}</pre>
                            </div>
                        </div>

                        <div v-if="selectedExecution.options">
                            <Label class="text-xs font-medium text-muted-foreground">Options</Label>
                            <div class="mt-1 p-3 bg-muted rounded-md text-sm max-h-32 overflow-auto">
                                <pre
                                    class="whitespace-pre-wrap">{{ JSON.stringify(selectedExecution.options, null, 2) }}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import { executionBundlesApi, executionsApi } from '@/services/api-client'
import type { ExecutionBundleResponse } from '@/services/definitions/execution-bundle'
import type { ExecutionResponse } from '@/services/definitions/execution'
import router from '@/router'

// State
const bundles = ref<ExecutionBundleResponse[]>([])
const executions = ref<ExecutionResponse[]>([])
const selectedBundle = ref<ExecutionBundleResponse | null>(null)
const selectedExecution = ref<ExecutionResponse | null>(null)
const focusedExecutionIndex = ref<number>(-1)

const bundlesLoading = ref(false)
const executionsLoading = ref(false)
const bundlesError = ref<string | null>(null)
const executionsError = ref<string | null>(null)

const searchQuery = ref('')

// Column resizing
const bundlesColumnWidth = ref(250)
const executionsColumnWidth = ref(300)
const isResizing = ref(false)
const currentResizingColumn = ref<'bundles' | 'executions' | null>(null)

// Refs for DOM elements
const containerRef = ref<HTMLElement | null>(null)
const executionsContainerRef = ref<HTMLElement | null>(null)

const startResize = (e: MouseEvent, column: 'bundles' | 'executions') => {
    e.preventDefault()
    isResizing.value = true
    currentResizingColumn.value = column
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
}

const handleResize = (e: MouseEvent) => {
    if (!isResizing.value || !containerRef.value) return

    const containerWidth = containerRef.value.offsetWidth
    const mouseX = e.clientX - containerRef.value.getBoundingClientRect().left

    if (currentResizingColumn.value === 'bundles') {
        bundlesColumnWidth.value = Math.max(100, Math.min(mouseX, containerWidth * 0.4))
    } else if (currentResizingColumn.value === 'executions') {
        const bundlesWidth = bundlesColumnWidth.value
        const maxExecutionsWidth = containerWidth * 0.4
        executionsColumnWidth.value = Math.max(100, Math.min(mouseX - bundlesWidth, maxExecutionsWidth))
    }
}

const stopResize = () => {
    isResizing.value = false
    currentResizingColumn.value = null
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
}

// Keyboard navigation for executions
const handleKeyNavigation = (e: KeyboardEvent) => {
    // Only handle navigation when executions column is focused and has items
    if (!selectedBundle.value || executions.value.length === 0) return

    // Check if the event is from arrow up/down keys
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault() // Prevent default scrolling

        // Determine the new index based on current focused index
        const currentIndex = focusedExecutionIndex.value
        const maxIndex = executions.value.length - 1

        let newIndex = currentIndex

        if (e.key === 'ArrowDown') {
            // Move down, wrapping to top if at the end
            newIndex = currentIndex < maxIndex ? currentIndex + 1 : 0
        } else if (e.key === 'ArrowUp') {
            // Move up, wrapping to bottom if at the top
            newIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex
        }

        // Update focused and selected execution
        focusedExecutionIndex.value = newIndex
        selectExecution(executions.value[newIndex])

        // Scroll to the selected item if it's not in view
        nextTick(() => {
            if (executionsContainerRef.value) {
                const selectedItem = executionsContainerRef.value.querySelector(`[data-index="${newIndex}"]`) as HTMLElement
                if (selectedItem) {
                    selectedItem.scrollIntoView({ block: 'nearest' })
                }
            }
        })
    }
}

// Add event listener when a bundle is selected
watch(selectedBundle, (newBundle) => {
    if (newBundle) {
        // Reset focused index when a new bundle is selected
        focusedExecutionIndex.value = -1

        // Add keyboard navigation listener
        document.addEventListener('keydown', handleKeyNavigation)
    } else {
        // Remove listener if no bundle is selected
        document.removeEventListener('keydown', handleKeyNavigation)
    }
})

onUnmounted(() => {
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    document.removeEventListener('keydown', handleKeyNavigation)
})

// Load bundles
const loadBundles = async () => {
    bundlesLoading.value = true
    bundlesError.value = null

    try {
        bundles.value = await executionBundlesApi.list({
            query: {
                prompt_id: router.currentRoute.value.query.prompt_id as string
            }
        })
    } catch (err) {
        bundlesError.value = err instanceof Error ? err.message : 'Failed to load execution bundles'
    } finally {
        bundlesLoading.value = false
    }
}

// Load executions for selected bundle
const loadExecutions = async () => {
    if (!selectedBundle.value) return

    executionsLoading.value = true
    executionsError.value = null

    try {
        const response = await executionsApi.list({
            query: {
                ids: selectedBundle.value.execution_ids.join(','),
                limit: '100' // Load all executions in the bundle
            }
        })
        executions.value = response.data
    } catch (err) {
        executionsError.value = err instanceof Error ? err.message : 'Failed to load executions'
    } finally {
        executionsLoading.value = false
    }
}

// Select bundle
const selectBundle = (bundle: ExecutionBundleResponse) => {
    selectedBundle.value = bundle
    selectedExecution.value = null
    executions.value = []
    loadExecutions()
}

// Select execution
const selectExecution = (execution: ExecutionResponse) => {
    selectedExecution.value = execution
}

// Debounced search
const debouncedSearch = debounce(() => {
    // For now, search is not implemented on the backend
    loadBundles()
}, 300)

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
    const endTime = new Date(execution.completed_at).getTime()
    const durationMs = endTime - startTime

    if (durationMs < 1000) {
        return `${durationMs}ms`
    } else {
        return `${(durationMs / 1000).toFixed(1)}s`
    }
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
const getResultValidVariant = (valid: boolean) => {
    return valid ? 'default' : 'destructive'
}

const formatJsonResult = (result: string) => {
    try {
        const parsed = JSON.parse(result)
        return JSON.stringify(parsed, null, 2)
    } catch {
        return result
    }
}

// Initialize
onMounted(() => {
    loadBundles()
})

// Watch for search changes
watch(searchQuery, () => {
    debouncedSearch()
})
</script>
