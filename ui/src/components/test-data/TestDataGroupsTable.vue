<template>
    <div class="space-y-4">
        <!-- Header with search and create button -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search groups..." class="w-64" @input="debouncedSearch" />
                <Select v-model="orderBy">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
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
                Create Group
            </Button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadGroups" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="groups.length === 0">
                        <TableCell colspan="5" class="text-center py-8 text-muted-foreground">
                            No test data groups found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="group in groups" :key="group.id">
                        <TableCell class="font-medium">{{ group.name }}</TableCell>
                        <TableHead>{{ group.mode }}</TableHead>
                        <TableCell class="max-w-xs">
                            <div class="truncate" :title="group.description">
                                {{ group.description || 'No description' }}
                            </div>
                        </TableCell>
                        <TableCell>{{ formatDate(group.created_at) }}</TableCell>
                        <TableCell>{{ formatDate(group.updated_at) }}</TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" @click="enterGroup(group)">
                                    <ArrowRight class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="editGroup(group)">
                                    <Edit class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="deleteGroup(group)"
                                    class="text-destructive hover:text-destructive">
                                    <Trash2 class="w-4 h-4" />
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

        <!-- Create/Edit Dialog -->
        <CreateGroupDialog v-model:open="showDialog" :editing-group="editingGroup" @success="onGroupSaved" />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { debounce } from 'lodash-es'
import { Plus, Edit, Trash2, ArrowRight } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import { testDataApi } from '@/services/api-client'
import type { TestDataGroupResponse } from '../../services/definitions/test-data'
import CreateGroupDialog from './CreateGroupDialog.vue'

// Reactive state
const groups = ref<TestDataGroupResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const orderBy = ref<'name' | 'created_at' | 'updated_at'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(100)

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
const editingGroup = ref<TestDataGroupResponse | null>(null)

// Router
const router = useRouter()

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadGroups()
}, 300)

// Load groups
const loadGroups = async () => {
    loading.value = true
    error.value = null

    try {
        const response = await testDataApi.groups.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                search: searchQuery.value || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value
            }
        })

        groups.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load test data groups'
    } finally {
        loading.value = false
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadGroups()
}

// Dialog management
const openCreateDialog = () => {
    editingGroup.value = null
    showDialog.value = true
}

const editGroup = (group: TestDataGroupResponse) => {
    editingGroup.value = group
    showDialog.value = true
}

const onGroupSaved = () => {
    showDialog.value = false
    editingGroup.value = null
    loadGroups()
}

// Navigation
const enterGroup = (group: TestDataGroupResponse) => {
    router.push(`/test-data/${group.id}`)
}

// Delete group
const deleteGroup = async (group: TestDataGroupResponse) => {
    if (!confirm(`Are you sure you want to delete "${group.name}"?`)) {
        return
    }

    try {
        await testDataApi.groups.delete(group.id)
        loadGroups()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete group'
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
    loadGroups()
})

// Initialize
onMounted(() => {
    loadGroups()
})
</script>
