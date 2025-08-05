<template>
    <Dialog :open="modelValue" @update:open="$emit('update:modelValue', $event)">
        <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2">
                    <Badge :variant="getStatusVariant(job?.status || 'pending')" class="flex items-center gap-1">
                        <div v-if="job?.status === 'running'" class="w-2 h-2 bg-current rounded-full animate-pulse">
                        </div>
                        <div v-if="job?.status === 'retrying'" class="w-2 h-2 bg-current rounded-full animate-bounce">
                        </div>
                        {{ job?.status }}
                    </Badge>
                    Job Details: {{ job?.type }}
                </DialogTitle>
                <DialogDescription>
                    Job ID: {{ job?.id }}
                </DialogDescription>
            </DialogHeader>

            <div class="flex-1 overflow-auto space-y-6">
                <!-- Job Overview -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-lg">Overview</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Type:</span>
                                <Badge variant="secondary">{{ job?.type }}</Badge>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Status:</span>
                                <Badge :variant="getStatusVariant(job?.status || 'pending')"
                                    class="flex items-center gap-1">
                                    <div v-if="job?.status === 'running'"
                                        class="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                                    <div v-if="job?.status === 'retrying'"
                                        class="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                    {{ job?.status }}
                                </Badge>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Attempts:</span>
                                <span>{{ job?.attempts }}/{{ job?.maxAttempts }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Created:</span>
                                <span>{{ job?.created_at ? formatDate(job.created_at) : '-' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Updated:</span>
                                <span>{{ job?.updated_at ? formatDate(job.updated_at) : '-' }}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-lg">Timing</CardTitle>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Scheduled:</span>
                                <span>{{ job?.scheduledAt ? formatDate(job.scheduledAt) : '-' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Started:</span>
                                <span>{{ job?.startedAt ? formatDate(job.startedAt) : '-' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Completed:</span>
                                <span>{{ job?.completedAt ? formatDate(job.completedAt) : '-' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Next Retry:</span>
                                <span>{{ job?.nextRetryAt ? formatDate(job.nextRetryAt) : '-' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-muted-foreground">Duration:</span>
                                <span>{{ formatDuration() }}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Retry Configuration -->
                <Card v-if="job?.retryDelayMs || job?.retryBackoffMultiplier || job?.maxRetryDelayMs">
                    <CardHeader>
                        <CardTitle class="text-lg">Retry Configuration</CardTitle>
                    </CardHeader>
                    <CardContent class="space-y-3">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div v-if="job?.retryDelayMs" class="flex justify-between">
                                <span class="text-muted-foreground">Retry Delay:</span>
                                <span>{{ job.retryDelayMs }}ms</span>
                            </div>
                            <div v-if="job?.retryBackoffMultiplier" class="flex justify-between">
                                <span class="text-muted-foreground">Backoff Multiplier:</span>
                                <span>{{ job.retryBackoffMultiplier }}x</span>
                            </div>
                            <div v-if="job?.maxRetryDelayMs" class="flex justify-between">
                                <span class="text-muted-foreground">Max Retry Delay:</span>
                                <span>{{ job.maxRetryDelayMs }}ms</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Job Data -->
                <Card v-if="job?.data">
                    <CardHeader>
                        <CardTitle class="text-lg">Job Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div class="bg-muted rounded-lg p-4 overflow-auto max-h-64">
                            <pre class="text-sm">{{ formatJson(job.data) }}</pre>
                        </div>
                    </CardContent>
                </Card>

                <!-- Job Result -->
                <Card v-if="job?.result && job.status === 'completed'">
                    <CardHeader>
                        <CardTitle class="text-lg text-green-600">Job Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div class="bg-muted rounded-lg p-4 overflow-auto max-h-64">
                            <pre class="text-sm">{{ formatJson(job.result) }}</pre>
                        </div>
                    </CardContent>
                </Card>

                <!-- Job Error -->
                <Card v-if="job?.error && ['failed', 'terminated'].includes(job.status)">
                    <CardHeader>
                        <CardTitle class="text-lg text-red-600">Error Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <p class="text-sm text-destructive">{{ job.error }}</p>
                        </div>
                        <div v-if="job.terminationReason" class="mt-3">
                            <span class="text-sm font-medium text-muted-foreground">Termination Reason:</span>
                            <p class="text-sm mt-1">{{ job.terminationReason }}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="$emit('close')">
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { JobResponse, JobStatus } from '@/services/definitions/job'

interface Props {
    modelValue: boolean
    job: JobResponse | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    close: []
}>()

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

// Format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

// Format duration
const formatDuration = () => {
    if (!props.job?.startedAt) return '-'

    const startTime = new Date(props.job.startedAt).getTime()
    let endTime: number

    if (props.job.completedAt) {
        endTime = new Date(props.job.completedAt).getTime()
    } else if (props.job.status === 'running') {
        endTime = Date.now()
    } else {
        return '-'
    }

    const durationMs = endTime - startTime

    if (durationMs < 1000) {
        return `${durationMs}ms`
    } else if (durationMs < 60000) {
        return `${(durationMs / 1000).toFixed(1)}s`
    } else {
        const minutes = Math.floor(durationMs / 60000)
        const seconds = Math.floor((durationMs % 60000) / 1000)
        return `${minutes}m ${seconds}s`
    }
}

// Format JSON
const formatJson = (obj: any) => {
    try {
        return JSON.stringify(obj, null, 2)
    } catch {
        return String(obj)
    }
}
</script>
