<template>
    <div class="space-y-4">
        <!-- Header with search and create button -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search deployments..." class="w-64"
                    @input="debouncedSearch" />
                <Select v-model="orderBy">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="provider">Provider</SelectItem>
                        <SelectItem value="model">Model</SelectItem>
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
            <Button @click="openCreateDialog">
                <Plus class="w-4 h-4 mr-2" />
                Create Deployment
            </Button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadDeployments" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Prompt</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="deployments.length === 0">
                        <TableCell colspan="8" class="text-center py-8 text-muted-foreground">
                            No deployments found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="deployment in deployments" :key="deployment.id">
                        <TableCell class="font-medium">{{ deployment.name }}</TableCell>
                        <TableCell class="max-w-xs">
                            <div class="truncate" :title="promptNames[deployment.promptId] || deployment.promptId">
                                {{ promptNames[deployment.promptId] || deployment.promptId }}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline">{{ deployment.provider }}</Badge>
                        </TableCell>
                        <TableCell>{{ deployment.model }}</TableCell>
                        <TableCell>
                            <div v-if="deployment.options" class="text-sm text-muted-foreground">
                                <div v-if="deployment.options.temperature !== undefined">
                                    Temp: {{ deployment.options.temperature }}
                                </div>
                                <div v-if="deployment.options.topP !== undefined">
                                    Top-P: {{ deployment.options.topP }}
                                </div>
                                <div v-if="deployment.options.topK !== undefined">
                                    Top-K: {{ deployment.options.topK }}
                                </div>
                            </div>
                            <span v-else class="text-muted-foreground">Default</span>
                        </TableCell>
                        <TableCell>{{ formatDate(deployment.created_at) }}</TableCell>
                        <TableCell>{{ formatDate(deployment.updated_at) }}</TableCell>
                        <TableCell class="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" class="h-8 w-8 p-0">
                                        <MoreHorizontal class="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem @click="editDeployment(deployment)">
                                        <Edit class="w-4 h-4 mr-2" />
                                        Edit deployment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="deleteDeployment(deployment)"
                                        class="text-destructive focus:text-destructive">
                                        <Trash2 class="w-4 h-4 mr-2" />
                                        Delete deployment
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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

        <!-- Create/Edit Dialog -->
        <CreateEditDeploymentDialog v-model:open="showDialog" :deployment="editingDeployment"
            @success="onDeploymentSuccess" />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { debounce } from 'lodash-es'
import { Plus, Edit, Trash2, Play, MoreHorizontal } from 'lucide-vue-next'

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
import DropdownMenu from '../ui/dropdown-menu/DropdownMenu.vue'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'

import { deploymentsApi, promptsApi } from '@/services/api-client'
import type { DeploymentResponse } from '../../services/definitions/deployment'
import CreateEditDeploymentDialog from './CreateEditDeploymentDialog.vue'
import { useUI } from '@/services/ui'

const { toast, confirm } = useUI()

// Reactive state
const deployments = ref<DeploymentResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const orderBy = ref<'name' | 'provider' | 'model' | 'created_at' | 'updated_at'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(25)

const pagination = ref<{
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
} | null>(null)

// Dialog state
const showDialog = ref(false)
const editingDeployment = ref<DeploymentResponse | null>(null)

// Prompt names cache
const promptNames = ref<Record<string, string>>({})

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadDeployments()
}, 300)

// Load deployments
const loadDeployments = async () => {
    loading.value = true
    error.value = null

    try {
        const response = await deploymentsApi.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                search: searchQuery.value || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value
            }
        })

        deployments.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }

        // Load prompt names for display
        await loadPromptNames()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load deployments'
    } finally {
        loading.value = false
    }
}

// Load prompt names for display
const loadPromptNames = async () => {
    try {
        const promptIds = [...new Set(deployments.value.map(d => d.promptId))]
        const promptsResponse = await promptsApi.selectList()

        const names: Record<string, string> = {}
        promptsResponse.items.forEach(prompt => {
            names[prompt.id] = prompt.name
        })
        promptNames.value = names
    } catch (err) {
        console.error('Failed to load prompt names:', err)
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadDeployments()
}

// Dialog management
const openCreateDialog = () => {
    editingDeployment.value = null
    showDialog.value = true
}

const editDeployment = (deployment: DeploymentResponse) => {
    editingDeployment.value = deployment
    showDialog.value = true
}

// Handle deployment success from dialog
const onDeploymentSuccess = () => {
    showDialog.value = false
    editingDeployment.value = null
    loadDeployments()
}

// Delete deployment
const deleteDeployment = async (deployment: DeploymentResponse) => {
    const confirmed = await confirm({
        title: 'Delete Deployment',
        message: `Are you sure you want to delete "${deployment.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'destructive'
    })

    if (!confirmed) return

    try {
        await deploymentsApi.delete(deployment.id)
        toast({
            title: 'Success',
            variant: 'success',
            description: 'Deployment deleted successfully'
        })
        loadDeployments()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete deployment'
        toast({
            title: 'Error',
            description: error.value,
            variant: 'error'
        })
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
watch([orderBy, orderDirection], () => {
    currentPage.value = 1
    loadDeployments()
})

// Initialize
onMounted(() => {
    loadDeployments()
})
</script>
