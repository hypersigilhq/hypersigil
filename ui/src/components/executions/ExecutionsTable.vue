<template>
    <div class="space-y-4">
        <!-- Header with filters -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search executions..." class="w-64" @input="debouncedSearch" />
                <PromptSelector v-model="promptId" :label="''" :null-option="true" class="w-64" />
                <Select v-model="statusFilter">
                    <SelectTrigger class="w-32">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
                <Select v-model="starred">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Starred" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                </Select>
                <Select v-model="orderBy">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="started_at">Started Date</SelectItem>
                        <SelectItem value="completed_at">Completed Date</SelectItem>
                    </SelectContent>
                </Select>
                <Select v-model="orderDirection">
                    <SelectTrigger class="w-32">
                        <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DESC">Desc</SelectItem>
                        <SelectItem value="ASC">Asc</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div class="flex items-center space-x-2">
                <Button @click="clearFilters" variant="destructive" size="sm">
                    <CircleX class="w-4 h-4 mr-2" />
                    Clear filters
                </Button>
                <Button @click="loadExecutions($event, true)" variant="default" size="sm">
                    <Download class="w-4 h-4 mr-2" />
                    Export
                </Button>
                <Button @click="loadExecutions" variant="outline" size="sm">
                    <RefreshCw class="w-4 h-4 mr-2" />
                    Refresh
                </Button>
                <Button @click="showScheduleExecutionDialog = true" variant="outline" size="sm">
                    <Plus class="w-4 h-4 mr-2" />
                    Schedule
                </Button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div v-if="stats" class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="bg-card border rounded-lg p-3">
                <div class="text-2xl font-bold">{{ stats.total }}</div>
                <div class="text-sm text-muted-foreground">Total</div>
            </div>
            <div class="bg-card border rounded-lg p-3">
                <div class="text-2xl font-bold text-yellow-600">{{ stats.pending }}</div>
                <div class="text-sm text-muted-foreground">Pending</div>
            </div>
            <div class="bg-card border rounded-lg p-3">
                <div class="text-2xl font-bold text-blue-600">{{ stats.running }}</div>
                <div class="text-sm text-muted-foreground">Running</div>
            </div>
            <div class="bg-card border rounded-lg p-3">
                <div class="text-2xl font-bold text-green-600">{{ stats.completed }}</div>
                <div class="text-sm text-muted-foreground">Completed</div>
            </div>
            <div class="bg-card border rounded-lg p-3">
                <div class="text-2xl font-bold text-red-600">{{ stats.failed }}</div>
                <div class="text-sm text-muted-foreground">Failed</div>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadExecutions" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Prompt</TableHead>
                        <TableHead>Provider/Model</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Starred</TableHead>
                        <TableHead>Result valid</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>I/O Tokens used</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="executions.length === 0">
                        <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
                            No executions found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="execution in executions" :key="execution.id">
                        <TableCell class="font-mono text-sm">
                            {{ execution.id.substring(0, 8) }}...
                        </TableCell>
                        <TableCell class="max-w-xs">
                            <div class="truncate" v-if="execution.prompt_id">
                                {{ execution.prompt?.name }} (#{{ execution.prompt?.version }})
                            </div>
                            <Badge :variant="'secondary'" class="flex items-center gap-1" v-if="execution.prompt_text">
                                Custom
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div class="text-sm">
                                <div class="font-medium">{{ execution.provider }}</div>
                                <div class="text-muted-foreground">{{ execution.model }}</div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge :variant="getStatusVariant(execution.status)" class="flex items-center gap-1">
                                <div v-if="execution.status === 'running'"
                                    class="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                {{ execution.status }}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Star :color="'gold'" :fill="'gold'" v-if="execution.starred" />
                        </TableCell>
                        <TableCell>
                            <template v-if="['completed', 'failed'].includes(execution.status)">
                                <Badge :variant="'destructive'" class="flex items-center gap-1"
                                    v-if="!execution.result_valid">
                                    Invalid
                                </Badge>
                                <Badge :variant="'secondary'" class="flex items-center gap-1"
                                    v-if="execution.result_valid">
                                    Valid
                                </Badge>
                            </template>
                        </TableCell>
                        <TableCell>
                            {{ execution.started_at ? formatDate(execution.started_at) : '-' }}
                        </TableCell>
                        <TableCell>
                            {{ execution.completed_at ? formatDate(execution.completed_at) : '-' }}
                        </TableCell>
                        <TableCell>
                            {{ formatDuration(execution) }}
                        </TableCell>
                        <TableCell>
                            <template v-if="execution.status === 'completed'">{{ execution.input_tokens_used }}/{{
                                execution.output_tokens_used }}</template>
                        </TableCell>

                        <TableCell class="text-right">
                            <div class="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" @click="viewExecution(execution)"
                                    v-tooltip.bottom="'View execution details'">
                                    <Eye class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="cloneExecution(execution)"
                                    v-tooltip.bottom="'Clone this execution'">
                                    <Copy class="w-4 h-4" />
                                </Button>
                                <Button v-if="execution.status === 'pending' || execution.status === 'running'"
                                    variant="ghost" size="sm" @click="cancelExecution(execution)"
                                    class="text-destructive hover:text-destructive"
                                    v-tooltip.bottom="'Cancel execution'">
                                    <X class="w-4 h-4" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination && pagination.totalPages > 1" class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
                Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to
                {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
                {{ pagination.total }} results
            </div>
            <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" :disabled="!pagination.hasPrev"
                    @click="goToPage(pagination.page - 1)">
                    Previous
                </Button>
                <span class="text-sm">
                    Page {{ pagination.page }} of {{ pagination.totalPages }}
                </span>
                <Button variant="outline" size="sm" :disabled="!pagination.hasNext"
                    @click="goToPage(pagination.page + 1)">
                    Next
                </Button>
            </div>
        </div>

        <ScheduleExecutionDialog :mode="'text'" v-model:open="showScheduleExecutionDialog"></ScheduleExecutionDialog>

        <!-- Clone Execution Dialog -->
        <ScheduleExecutionDialog v-model:open="showCloneDialog" :prompt-id="cloningExecution?.prompt_id"
            :initial-data="cloneInitialData" :source-execution-id="cloningExecution?.id" @success="onCloneSuccess" />

        <!-- View Dialog -->
        <ExecutionDetailsDialog v-model="showViewDialog" :execution="viewingExecution"
            @close="showViewDialog = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'
import { RefreshCw, Eye, X, Copy, Star, Download, CircleX, Plus } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import ExecutionDetailsDialog from './ExecutionDetailsDialog.vue'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { executionsApi } from '@/services/api-client'
import ScheduleExecutionDialog from './ScheduleExecutionDialog.vue'
import type { ExecutionResponse } from '../../services/definitions/execution'
import PromptSelector from '../prompts/PromptSelector.vue'
import router from '@/router'

interface ExecutionStats {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    byProvider: Record<string, number>
}

// Reactive state
const executions = ref<ExecutionResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const promptId = ref('')
const starred = ref<'yes' | 'no' | 'all'>('all')
const statusFilter = ref<'pending' | 'running' | 'completed' | 'failed' | 'all'>('all')
const orderBy = ref<'created_at' | 'updated_at' | 'started_at' | 'completed_at'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(100)
const stats = ref<ExecutionStats | null>(null)

const pagination = ref<{
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
} | null>(null)

// Dialog state
const showViewDialog = ref(false)
const showCloneDialog = ref(false)
const showScheduleExecutionDialog = ref(false)
const viewingExecution = ref<ExecutionResponse | null>(null)
const cloningExecution = ref<ExecutionResponse | null>(null)
const currentExecutionIndex = ref(-1)
const cloneInitialData = ref<{
    userInput: string
    providerModel: string[]
    options?: {
        temperature?: number
        maxTokens?: number
        topP?: number
        topK?: number
    }
} | undefined>(undefined)

// Auto-refresh interval
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadExecutions()
}, 300)

const clearFilters = () => {
    searchQuery.value = ''
    promptId.value = ''
    starred.value = 'all'
    statusFilter.value = 'all'
    orderBy.value = 'created_at'
    orderDirection.value = 'DESC'
    currentPage.value = 1
}

// Load executions
const loadExecutions = async ($event = null, download: boolean = false) => {
    loading.value = true
    error.value = null

    try {
        let st: any = {}
        if (statusFilter.value === 'all') {
            st = undefined
        } else {
            st = statusFilter.value
        }
        const response = await executionsApi.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                status: st || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value,
                ...(promptId.value && { promptId: promptId.value }),
                ...(starred.value !== 'all' && { starred: starred.value === 'yes' }),
                downloadCsv: download
            }
        })

        if (download) {
            return
        }

        executions.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load executions'
    } finally {
        loading.value = false
    }
}

// Load stats
const loadStats = async () => {
    try {
        stats.value = await executionsApi.getStats()
    } catch (err) {
        console.error('Failed to load stats:', err)
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadExecutions()
}

// View execution
const viewExecution = (execution: ExecutionResponse) => {
    viewingExecution.value = execution
    currentExecutionIndex.value = executions.value.findIndex(e => e.id === execution.id)
    showViewDialog.value = true

    // Add event listener for keyboard navigation
    nextTick(() => {
        window.addEventListener('keydown', handleExecutionKeyNavigation)
    })
}

// Handle keyboard navigation for executions
const handleExecutionKeyNavigation = (event: KeyboardEvent) => {
    if (!showViewDialog.value) return

    switch (event.key) {
        case 'ArrowUp':
            event.preventDefault()
            navigateExecutions(-1)
            break
        case 'ArrowDown':
            event.preventDefault()
            navigateExecutions(1)
            break
    }
}

// Navigate between executions
const navigateExecutions = (direction: number) => {
    if (currentExecutionIndex.value === -1) return

    const newIndex = currentExecutionIndex.value + direction
    if (newIndex >= 0 && newIndex < executions.value.length) {
        currentExecutionIndex.value = newIndex
        viewingExecution.value = executions.value[newIndex]
    }
}

// Clone execution
const cloneExecution = (execution: ExecutionResponse) => {
    cloningExecution.value = execution
    cloneInitialData.value = {
        userInput: execution.user_input,
        providerModel: [`${execution.provider}:${execution.model}`],
        options: execution.options
    }
    showCloneDialog.value = true
}

// Handle clone success
const onCloneSuccess = (executionId: string) => {
    console.log('Execution cloned successfully:', executionId)
    showCloneDialog.value = false
    cloningExecution.value = null
    cloneInitialData.value = undefined
    loadExecutions()
    loadStats()
}

// Cancel execution
const cancelExecution = async (execution: ExecutionResponse) => {
    if (!confirm(`Are you sure you want to cancel this execution?`)) {
        return
    }

    try {
        await executionsApi.cancel(execution.id)
        loadExecutions()
        loadStats()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to cancel execution'
    }
}

// Get status badge variant
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

// Watchers
watch([statusFilter, orderBy, orderDirection, promptId, starred], () => {
    currentPage.value = 1
    loadExecutions()
})

// Auto-refresh for running executions
const startAutoRefresh = () => {
    refreshInterval = setInterval(() => {
        // Only refresh if there are running or pending executions
        if (executions.value.some(e => e.status === 'running' || e.status === 'pending')) {
            loadExecutions()
            loadStats()
        }
    }, 5000) // Refresh every 5 seconds
}

const stopAutoRefresh = () => {
    if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
    }
}

// Initialize
onMounted(() => {
    let promptIdQuery = router.currentRoute.value.query.prompt_id as string
    if (promptIdQuery) {
        promptId.value = promptIdQuery
    }

    loadExecutions()
    loadStats()
    startAutoRefresh()
})

onUnmounted(() => {
    stopAutoRefresh()
})
</script>
