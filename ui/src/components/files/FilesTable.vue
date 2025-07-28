<template>
    <div class="space-y-4">
        <!-- Header with search and upload button -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search files..." class="w-64" @input="debouncedSearch" />
                <Select v-model="orderBy">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="originalName">Original Name</SelectItem>
                        <SelectItem value="size">Size</SelectItem>
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
            <Button @click="showUploadDialog = true">
                <Upload class="w-4 h-4 mr-2" />
                Upload Files
            </Button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadFiles" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Original Name</TableHead>
                        <TableHead>Extension</TableHead>
                        <TableHead>MIME Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="files.length === 0">
                        <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
                            No files found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="file in files" :key="file.id">
                        <TableCell class="font-mono text-sm">{{ file.id.slice(0, 8) }}...</TableCell>
                        <TableCell class="font-medium">{{ file.originalName }}</TableCell>
                        <TableCell>{{ getFileExtension(file.originalName) }}</TableCell>
                        <TableCell>{{ file.mimeType }}</TableCell>
                        <TableCell>{{ formatFileSize(file.size) }}</TableCell>
                        <TableCell>{{ formatDate(file.created_at) }}</TableCell>
                        <TableCell class="text-right">
                            <Button variant="ghost" size="sm" @click="deleteFile(file)"
                                class="text-destructive hover:text-destructive">
                                <Trash2 class="h-4 w-4" />
                            </Button>
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

        <!-- Upload Dialog -->
        <FileUploadDialog v-model:open="showUploadDialog" @uploaded="loadFiles" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { debounce } from 'lodash-es'
import { Upload, Trash2 } from 'lucide-vue-next'

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

import { filesApi } from '@/services/api-client'
import type { FileResponse } from '../../services/definitions/file'
import { useUI } from '@/services/ui'
import FileUploadDialog from './FileUploadDialog.vue'
import { formatFileSize } from '@/lib/utils'

const { toast, confirm } = useUI()

// Reactive state
const files = ref<FileResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const orderBy = ref<'name' | 'originalName' | 'size' | 'created_at' | 'updated_at'>('created_at')
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

// Upload dialog state
const showUploadDialog = ref(false)

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadFiles()
}, 300)

// Load files
const loadFiles = async () => {
    loading.value = true
    error.value = null

    try {
        const response = await filesApi.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                search: searchQuery.value || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value
            }
        })

        files.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load files'
    } finally {
        loading.value = false
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadFiles()
}


// Delete file
const deleteFile = async (file: FileResponse) => {
    const confirmed = await confirm({
        title: 'Delete File',
        message: `Are you sure you want to delete "${file.originalName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'destructive'
    })

    if (!confirmed) return

    try {
        await filesApi.delete(file.id)
        toast({
            title: 'Success',
            variant: 'success',
            description: 'File deleted successfully'
        })
        loadFiles()
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file'
        toast({
            title: 'Error',
            description: errorMessage,
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

const getFileExtension = (filename: string) => {
    const lastDot = filename.lastIndexOf('.')
    return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : ''
}

// Watchers
watch([orderBy, orderDirection], () => {
    currentPage.value = 1
    loadFiles()
})

// Initialize
onMounted(() => {
    loadFiles()
})
</script>
