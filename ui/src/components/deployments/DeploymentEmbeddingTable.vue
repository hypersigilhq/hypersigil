<template>
    <div class="space-y-4">
        <!-- Header with search and create button -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search deployment embeddings..." class="w-64"
                    @input="debouncedSearch" />
                <Select v-model="orderBy">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
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
                Create Deployment Embedding
            </Button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadDeploymentEmbeddings" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Input Type</TableHead>
                        <TableHead>Webhook</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="deploymentEmbeddings.length === 0">
                        <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
                            No deployment embeddings found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="deploymentEmbedding in deploymentEmbeddings" :key="deploymentEmbedding.id">
                        <TableCell class="font-medium">{{ deploymentEmbedding.name }}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{{ deploymentEmbedding.model }}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge v-if="deploymentEmbedding.inputType" variant="secondary">
                                {{ deploymentEmbedding.inputType }}
                            </Badge>
                            <span v-else class="text-muted-foreground">Default</span>
                        </TableCell>
                        <TableCell>
                            <div v-if="deploymentEmbedding.webhookDestinationIds && deploymentEmbedding.webhookDestinationIds.length > 0"
                                class="space-y-1">
                                <div v-for="webhookId in deploymentEmbedding.webhookDestinationIds" :key="webhookId"
                                    class="text-sm">
                                    <Badge variant="secondary" class="text-xs">
                                        {{ webhookNames[webhookId] || webhookId }}
                                    </Badge>
                                </div>
                            </div>
                            <span v-else class="text-muted-foreground text-sm">None</span>
                        </TableCell>
                        <TableCell>{{ formatDate(deploymentEmbedding.created_at) }}</TableCell>
                        <TableCell>{{ formatDate(deploymentEmbedding.updated_at) }}</TableCell>
                        <TableCell class="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" class="h-8 w-8 p-0">
                                        <MoreHorizontal class="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem @click="editDeploymentEmbedding(deploymentEmbedding)">
                                        <Edit class="w-4 h-4 mr-2" />
                                        Edit embedding
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="deleteDeploymentEmbedding(deploymentEmbedding)"
                                        class="text-destructive focus:text-destructive">
                                        <Trash2 class="w-4 h-4 mr-2" />
                                        Delete embedding
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
        <CreateEditDeploymentEmbeddingDialog v-model:open="showDialog"
            :deployment-embedding="editingDeploymentEmbedding" @success="onDeploymentEmbeddingSuccess" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { debounce } from 'lodash-es'
import { Plus, Edit, Trash2, MoreHorizontal } from 'lucide-vue-next'

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

import { deploymentEmbeddingsApi, settingsApi } from '@/services/api-client'
import type { DeploymentEmbeddingResponse } from '../../services/definitions/deployment-embedding'
import type { WebhookDestinationSettings } from '../../services/definitions/settings'
import CreateEditDeploymentEmbeddingDialog from './CreateEditDeploymentEmbeddingDialog.vue'
import { useUI } from '@/services/ui'

const { toast, confirm } = useUI()

// Reactive state
const deploymentEmbeddings = ref<DeploymentEmbeddingResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const orderBy = ref<'name' | 'model' | 'created_at' | 'updated_at'>('created_at')
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
const editingDeploymentEmbedding = ref<DeploymentEmbeddingResponse | null>(null)

// Webhook names cache
const webhookNames = ref<Record<string, string>>({})

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadDeploymentEmbeddings()
}, 300)

// Load deployment embeddings
const loadDeploymentEmbeddings = async () => {
    loading.value = true
    error.value = null

    try {
        const response = await deploymentEmbeddingsApi.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                search: searchQuery.value || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value
            }
        })

        deploymentEmbeddings.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }

        // Load prompt names and webhook names for display
        await loadWebhookNames()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load deployment embeddings'
    } finally {
        loading.value = false
    }
}

// Load webhook destination names for display
const loadWebhookNames = async () => {
    try {
        const webhookResponse = await settingsApi.listByType('webhook-destination')

        const names: Record<string, string> = {}
        webhookResponse.settings.forEach(setting => {
            if (setting.type === 'webhook-destination') {
                const webhookSetting = setting as WebhookDestinationSettings
                names[webhookSetting.id] = webhookSetting.name
            }
        })
        webhookNames.value = names
    } catch (err) {
        console.error('Failed to load webhook destination names:', err)
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadDeploymentEmbeddings()
}

// Dialog management
const openCreateDialog = () => {
    editingDeploymentEmbedding.value = null
    showDialog.value = true
}

const editDeploymentEmbedding = (deploymentEmbedding: DeploymentEmbeddingResponse) => {
    editingDeploymentEmbedding.value = deploymentEmbedding
    showDialog.value = true
}

// Handle deployment embedding success from dialog
const onDeploymentEmbeddingSuccess = () => {
    showDialog.value = false
    editingDeploymentEmbedding.value = null
    loadDeploymentEmbeddings()
}

// Delete deployment embedding
const deleteDeploymentEmbedding = async (deploymentEmbedding: DeploymentEmbeddingResponse) => {
    const confirmed = await confirm({
        title: 'Delete Deployment Embedding',
        message: `Are you sure you want to delete "${deploymentEmbedding.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'destructive'
    })

    if (!confirmed) return

    try {
        await deploymentEmbeddingsApi.delete(deploymentEmbedding.id)
        toast({
            title: 'Success',
            variant: 'success',
            description: 'Deployment embedding deleted successfully'
        })
        loadDeploymentEmbeddings()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete deployment embedding'
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
    loadDeploymentEmbeddings()
})

// Initialize
onMounted(() => {
    loadDeploymentEmbeddings()
})
</script>
