<template>
    <div class="space-y-4">
        <!-- Header with filters -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search executions..." class="w-64" @input="debouncedSearch" />
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
                <Button @click="loadExecutions" variant="outline" size="sm">
                    <RefreshCw class="w-4 h-4 mr-2" />
                    Refresh
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
                        <TableHead>User Input</TableHead>
                        <TableHead>Provider/Model</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
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
                            <div class="truncate" :title="execution.user_input">
                                {{ execution.user_input }}
                            </div>
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
                            {{ execution.started_at ? formatDate(execution.started_at) : '-' }}
                        </TableCell>
                        <TableCell>
                            {{ execution.completed_at ? formatDate(execution.completed_at) : '-' }}
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" @click="viewExecution(execution)">
                                    <Eye class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="cloneExecution(execution)">
                                    <Copy class="w-4 h-4" />
                                </Button>
                                <Button v-if="execution.status === 'pending' || execution.status === 'running'"
                                    variant="ghost" size="sm" @click="cancelExecution(execution)"
                                    class="text-destructive hover:text-destructive">
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

        <!-- Clone Execution Dialog -->
        <ScheduleExecutionDialog v-model:open="showCloneDialog" :prompt-id="cloningExecution?.prompt_id"
            :initial-data="cloneInitialData" :source-execution-id="cloningExecution?.id" @success="onCloneSuccess" />

        <!-- View Dialog -->
        <Dialog v-model:open="showViewDialog">
            <DialogContent class="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Execution Details</DialogTitle>
                    <DialogDescription>
                        ID: {{ viewingExecution?.id }}
                    </DialogDescription>
                </DialogHeader>

                <div v-if="viewingExecution" class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Status</Label>
                            <div class="mt-1">
                                <Badge :variant="getStatusVariant(viewingExecution.status)"
                                    class="flex items-center gap-1 w-fit">
                                    <div v-if="viewingExecution.status === 'running'"
                                        class="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                    {{ viewingExecution.status }}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Label>Provider/Model</Label>
                            <div class="mt-1 text-sm">
                                {{ viewingExecution.provider }}:{{ viewingExecution.model }}
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Created</Label>
                            <div class="mt-1 text-sm">{{ formatDate(viewingExecution.created_at) }}</div>
                        </div>
                        <div>
                            <Label>Started</Label>
                            <div class="mt-1 text-sm">{{ viewingExecution.started_at ?
                                formatDate(viewingExecution.started_at) : '-' }}</div>
                        </div>
                        <div>
                            <Label>Completed</Label>
                            <div class="mt-1 text-sm">{{ viewingExecution.completed_at ?
                                formatDate(viewingExecution.completed_at) : '-' }}</div>
                        </div>
                    </div>

                    <div>
                        <Label>User Input</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md">
                            <pre class="whitespace-pre-wrap text-sm">{{ viewingExecution.user_input }}</pre>
                        </div>
                    </div>

                    <div v-if="viewingExecution.result">
                        <Label>Result</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md">
                            <pre class="whitespace-pre-wrap text-sm">{{ viewingExecution.result }}</pre>
                        </div>
                    </div>

                    <div v-if="viewingExecution.error_message">
                        <Label>Error Message</Label>
                        <div class="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <pre
                                class="whitespace-pre-wrap text-sm text-destructive">{{ viewingExecution.error_message }}</pre>
                        </div>
                    </div>

                    <div v-if="viewingExecution.options">
                        <Label>Execution Options</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md">
                            <pre class="text-sm">{{ JSON.stringify(viewingExecution.options, null, 2) }}</pre>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button @click="showViewDialog = false">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import { RefreshCw, Eye, X, Copy } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { executionsApi } from '@/services/api-client'
import ScheduleExecutionDialog from './ScheduleExecutionDialog.vue'

// Types based on execution-definitions.ts
interface ExecutionResponse {
    id: string
    prompt_id: string
    user_input: string
    provider: string
    model: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    result?: string
    error_message?: string
    started_at?: string
    completed_at?: string
    created_at: string
    updated_at: string
    options?: Record<string, any>
}

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
const statusFilter = ref<'pending' | 'running' | 'completed' | 'failed' | 'all'>('all')
const orderBy = ref<'created_at' | 'updated_at' | 'started_at' | 'completed_at'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(10)
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
const viewingExecution = ref<ExecutionResponse | null>(null)
const cloningExecution = ref<ExecutionResponse | null>(null)
const cloneInitialData = ref<{
    userInput: string
    providerModel: string
    options?: {
        temperature?: number
        maxTokens?: number
        topP?: number
        topK?: number
    }
} | undefined>(undefined)

// Auto-refresh interval
let refreshInterval: number | null = null

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadExecutions()
}, 300)

// Load executions
const loadExecutions = async () => {
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
                orderDirection: orderDirection.value
            }
        })

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
    showViewDialog.value = true
}

// Clone execution
const cloneExecution = (execution: ExecutionResponse) => {
    cloningExecution.value = execution
    cloneInitialData.value = {
        userInput: execution.user_input,
        providerModel: `${execution.provider}:${execution.model}`,
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

// Watchers
watch([statusFilter, orderBy, orderDirection], () => {
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
    loadExecutions()
    loadStats()
    startAutoRefresh()
})

onUnmounted(() => {
    stopAutoRefresh()
})
</script>
