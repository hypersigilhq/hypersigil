<template>
    <div class="space-y-4">
        <!-- Header with filters -->
        <div class="flex items-center justify-between">
            <div class="flex flex-wrap items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search jobs..." class="w-64" @input="debouncedSearch" />
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
                        <SelectItem value="retrying">Retrying</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                </Select>
                <Input v-model="jobNameFilter" placeholder="Job type..." class="w-40" @input="debouncedSearch" />
                <Select v-model="orderBy">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="scheduledAt">Scheduled Date</SelectItem>
                        <SelectItem value="startedAt">Started Date</SelectItem>
                        <SelectItem value="completedAt">Completed Date</SelectItem>
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
            <div class="flex flex-wrap items-center space-x-2">
                <Button @click="clearFilters" variant="destructive" size="sm">
                    <CircleX class="w-4 h-4 mr-2" />
                    Clear filters
                </Button>
                <Button @click="loadJobs" variant="outline" size="sm">
                    <RefreshCw class="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div v-if="stats" class="grid grid-cols-2 md:grid-cols-6 gap-4">
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
            <div class="bg-card border rounded-lg p-3">
                <div class="text-2xl font-bold text-orange-600">{{ stats.retrying }}</div>
                <div class="text-sm text-muted-foreground">Retrying</div>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadJobs" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Next Retry</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="jobs.length === 0">
                        <TableCell colspan="9" class="text-center py-8 text-muted-foreground">
                            No jobs found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="job in jobs" :key="job.id" class="cursor-pointer hover:bg-muted/50"
                        @click="viewJob(job)">
                        <TableCell class="font-mono text-sm">
                            {{ job.id.substring(0, 8) }}...
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary">{{ job.type }}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge :variant="getStatusVariant(job.status)" class="flex items-center gap-1">
                                <div v-if="job.status === 'running'"
                                    class="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                <div v-if="job.status === 'retrying'"
                                    class="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                {{ job.status }}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <span class="text-sm">{{ job.attempts }}/{{ job.maxAttempts }}</span>
                        </TableCell>
                        <TableCell>
                            {{ formatDate(job.scheduledAt) }}
                        </TableCell>
                        <TableCell>
                            {{ job.startedAt ? formatDate(job.startedAt) : '-' }}
                        </TableCell>
                        <TableCell>
                            {{ job.completedAt ? formatDate(job.completedAt) : '-' }}
                        </TableCell>
                        <TableCell>
                            {{ job.nextRetryAt ? formatDate(job.nextRetryAt) : '-' }}
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" @click.stop="viewJob(job)"
                                    v-tooltip.bottom="'View job details'">
                                    <Eye class="w-4 h-4" />
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

        <!-- Job Details Dialog -->
        <JobDetailsDialog v-model="showViewDialog" :job="viewingJob" @close="showViewDialog = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { debounce } from 'lodash-es'
import { RefreshCw, Eye, CircleX } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { jobsApi } from '@/services/api-client'
import type { JobResponse, JobStatus } from '@/services/definitions/job'
import JobDetailsDialog from './JobDetailsDialog.vue'

interface JobStats {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    retrying: number
    terminated: number
}

// Reactive state
const jobs = ref<JobResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const jobNameFilter = ref('')
const statusFilter = ref<JobStatus | 'all'>('all')
const orderBy = ref<'created_at' | 'updated_at' | 'scheduledAt' | 'startedAt' | 'completedAt'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(100)
const stats = ref<JobStats | null>(null)

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
const viewingJob = ref<JobResponse | null>(null)

// Router
const route = useRoute()
const router = useRouter()

// Auto-refresh interval
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadJobs()
}, 300)

const clearFilters = () => {
    searchQuery.value = ''
    jobNameFilter.value = ''
    statusFilter.value = 'all'
    orderBy.value = 'created_at'
    orderDirection.value = 'DESC'
    currentPage.value = 1
}

// Load jobs
const loadJobs = async () => {
    loading.value = true
    error.value = null

    try {
        const response = await jobsApi.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                status: statusFilter.value === 'all' ? undefined : statusFilter.value,
                jobName: jobNameFilter.value || undefined,
                search: searchQuery.value || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value
            }
        })

        jobs.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }

        // Calculate stats from current data
        calculateStats()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load jobs'
    } finally {
        loading.value = false
    }
}

// Calculate stats from current jobs data
const calculateStats = () => {
    const allJobs = jobs.value
    stats.value = {
        total: allJobs.length,
        pending: allJobs.filter(j => j.status === 'pending').length,
        running: allJobs.filter(j => j.status === 'running').length,
        completed: allJobs.filter(j => j.status === 'completed').length,
        failed: allJobs.filter(j => j.status === 'failed').length,
        retrying: allJobs.filter(j => j.status === 'retrying').length,
        terminated: allJobs.filter(j => j.status === 'terminated').length
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadJobs()
}

// View job
const viewJob = (job: JobResponse) => {
    viewingJob.value = job
    showViewDialog.value = true

    // Update URL with job ID for deep linking
    router.push({
        name: 'jobs',
        query: {
            ...route.query,
            jobId: job.id
        }
    })
}

// Handle dialog close
const handleDialogClose = () => {
    showViewDialog.value = false
    viewingJob.value = null

    // Remove jobId from URL
    const query = { ...route.query }
    delete query.jobId
    router.push({ name: 'jobs', query })
}

// Get status badge variant
const getStatusVariant = (status: JobStatus) => {
    switch (status) {
        case 'pending':
            return 'secondary'
        case 'running':
            return 'default'
        case 'completed':
            return 'default'
        case 'failed':
            return 'destructive'
        case 'retrying':
            return 'secondary'
        case 'terminated':
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
watch([statusFilter, orderBy, orderDirection, jobNameFilter], () => {
    currentPage.value = 1
    loadJobs()
})

// Handle deep linking
watch(() => route.query.jobId, async (jobId) => {
    if (jobId && typeof jobId === 'string') {
        try {
            const job = await jobsApi.getById(jobId)
            viewingJob.value = job
            showViewDialog.value = true
        } catch (err) {
            console.error('Failed to load job for deep link:', err)
            // Remove invalid jobId from URL
            const query = { ...route.query }
            delete query.jobId
            router.replace({ name: 'jobs', query })
        }
    }
}, { immediate: true })

// Auto-refresh for running jobs
const startAutoRefresh = () => {
    refreshInterval = setInterval(() => {
        // Only refresh if there are running, pending, or retrying jobs
        if (jobs.value.some(j => ['running', 'pending', 'retrying'].includes(j.status))) {
            loadJobs()
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
    loadJobs()
    startAutoRefresh()
})

onUnmounted(() => {
    stopAutoRefresh()
})

// Watch dialog state to handle URL updates
watch(showViewDialog, (isOpen) => {
    if (!isOpen) {
        handleDialogClose()
    }
})
</script>
