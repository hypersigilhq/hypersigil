<template>
    <div class="space-y-4">
        <!-- Header with search and create button -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search items..." class="w-64" @input="debouncedSearch" />
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
            <div class="flex space-x-2">
                <Button @click="openImportDialog" variant="outline">
                    <Upload class="w-4 h-4 mr-2" />
                    Import
                </Button>
                <Button @click="openCreateDialog">
                    <Plus class="w-4 h-4 mr-2" />
                    Create Item
                </Button>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadItems" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="items.length === 0">
                        <TableCell colspan="4" class="text-center py-8 text-muted-foreground">
                            No test data items found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="item in items" :key="item.id">
                        <TableCell class="font-medium">{{ item.name || 'Unnamed Item' }}</TableCell>
                        <TableCell>{{ formatDate(item.created_at) }}</TableCell>
                        <TableCell>{{ formatDate(item.updated_at) }}</TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" @click="viewItem(item)">
                                    <Eye class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="editItem(item)">
                                    <Edit class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="deleteItem(item)"
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
        <CreateItemDialog v-model:open="showDialog" :group-id="groupId" :editing-item="editingItem"
            @success="onItemSaved" />

        <!-- View Dialog -->
        <ViewItemDialog v-model:open="showViewDialog" :item="viewingItem" />

        <!-- Import Dialog -->
        <ImportItemsDialog v-model:open="showImportDialog" :group-id="groupId" @success="onImportSuccess" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { debounce } from 'lodash-es'
import { Plus, Edit, Trash2, Eye, Upload } from 'lucide-vue-next'

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
import type { TestDataItemResponse } from '../../services/definitions/test-data'
import CreateItemDialog from './CreateItemDialog.vue'
import ViewItemDialog from './ViewItemDialog.vue'
import ImportItemsDialog from './ImportItemsDialog.vue'

interface Props {
    groupId: string
}

interface Emits {
    (e: 'group-loaded', name: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const items = ref<TestDataItemResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const orderBy = ref<'name' | 'created_at' | 'updated_at'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(10)

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
const showViewDialog = ref(false)
const showImportDialog = ref(false)
const editingItem = ref<TestDataItemResponse | null>(null)
const viewingItem = ref<TestDataItemResponse | null>(null)

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadItems()
}, 300)

// Load items
const loadItems = async () => {
    loading.value = true
    error.value = null

    try {
        const response = await testDataApi.groups.listItems(props.groupId, {
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                search: searchQuery.value || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value
            }
        })

        items.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }

        // Load group info to emit group name
        if (response.data.length > 0 || currentPage.value === 1) {
            loadGroupInfo()
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load test data items'
    } finally {
        loading.value = false
    }
}

// Load group info
const loadGroupInfo = async () => {
    try {
        const group = await testDataApi.groups.getById(props.groupId)
        emit('group-loaded', group.name)
    } catch (err) {
        // Ignore error for group info
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadItems()
}

// Dialog management
const openCreateDialog = () => {
    editingItem.value = null
    showDialog.value = true
}

const openImportDialog = () => {
    showImportDialog.value = true
}

const editItem = (item: TestDataItemResponse) => {
    editingItem.value = item
    showDialog.value = true
}

const viewItem = (item: TestDataItemResponse) => {
    viewingItem.value = item
    showViewDialog.value = true
}

const onItemSaved = () => {
    showDialog.value = false
    editingItem.value = null
    loadItems()
}

const onImportSuccess = (itemsCreated: number) => {
    showImportDialog.value = false
    loadItems()
    // Could show a success message here if desired
    console.log(`Successfully imported ${itemsCreated} items`)
}

// Delete item
const deleteItem = async (item: TestDataItemResponse) => {
    if (!confirm(`Are you sure you want to delete this item?`)) {
        return
    }

    try {
        await testDataApi.items.delete(item.id)
        loadItems()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete item'
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
    loadItems()
})

watch(() => props.groupId, () => {
    currentPage.value = 1
    loadItems()
}, { immediate: true })

// Initialize
onMounted(() => {
    loadItems()
})
</script>
