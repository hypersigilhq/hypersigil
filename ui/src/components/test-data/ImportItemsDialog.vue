<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-4xl max-h-[80vh]">
            <DialogHeader>
                <DialogTitle>Import Test Data Items</DialogTitle>
                <DialogDescription>
                    Select multiple files to import as test data items. Each file will be processed and added to the
                    current group.
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-6">
                <!-- File Selection -->
                <div v-if="!processing && !completed" class="space-y-4">
                    <div>
                        <Label for="file-input">Select Files</Label>
                        <div class="mt-2">
                            <input id="file-input" ref="fileInput" type="file" multiple :accept="supportedFileTypes"
                                @change="onFilesSelected"
                                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
                        </div>
                        <p class="text-sm text-muted-foreground mt-1">
                            Supported formats: {{ parserDisplayNames.join(', ') }}
                        </p>
                    </div>

                    <!-- Selected Files Preview -->
                    <div v-if="selectedFiles.length > 0" class="space-y-2">
                        <Label>Selected Files ({{ selectedFiles.length }})</Label>
                        <div class="border rounded-lg p-3 max-h-32 overflow-y-auto">
                            <div v-for="file in selectedFiles" :key="file.name" class="text-sm py-1">
                                {{ file.name }} ({{ formatFileSize(file.size) }})
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Processing Progress -->
                <div v-if="processing || completed" class="space-y-4">
                    <div class="flex items-center justify-between">
                        <Label>Import Progress</Label>
                        <div class="text-sm text-muted-foreground">
                            {{ progress?.processedFiles || 0 }} / {{ progress?.totalFiles || 0 }} files processed
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-primary h-2 rounded-full transition-all duration-300"
                            :style="{ width: `${progressPercentage}%` }"></div>
                    </div>

                    <!-- Results Table -->
                    <div class="border rounded-lg max-h-64 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Items Created</TableHead>
                                    <TableHead>Error</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="result in progress?.results || []" :key="result.fileName">
                                    <TableCell class="font-medium">{{ result.fileName }}</TableCell>
                                    <TableCell>
                                        <div class="flex items-center space-x-2">
                                            <div v-if="result.status === 'pending'"
                                                class="w-2 h-2 bg-gray-400 rounded-full"></div>
                                            <div v-else-if="result.status === 'processing'"
                                                class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                            <div v-else-if="result.status === 'success'"
                                                class="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <div v-else-if="result.status === 'error'"
                                                class="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <span class="text-sm capitalize">{{ result.status }}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {{ result.items?.length || 0 }}
                                    </TableCell>
                                    <TableCell class="text-red-600 text-sm">
                                        {{ result.error || '' }}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <!-- Summary -->
                    <div v-if="completed" class="bg-gray-50 rounded-lg p-4">
                        <div class="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div class="text-2xl font-bold text-green-600">{{ progress?.successfulFiles || 0 }}
                                </div>
                                <div class="text-sm text-muted-foreground">Successful</div>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-red-600">{{ progress?.failedFiles || 0 }}</div>
                                <div class="text-sm text-muted-foreground">Failed</div>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-blue-600">{{ totalItemsCreated }}</div>
                                <div class="text-sm text-muted-foreground">Items Created</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error Display -->
                <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="text-red-800 text-sm">{{ error }}</div>
                </div>
            </div>

            <DialogFooter>
                <Button v-if="!processing && !completed" variant="outline" @click="closeDialog">
                    Cancel
                </Button>
                <Button v-if="!processing && !completed" @click="startImport" :disabled="selectedFiles.length === 0">
                    Import {{ selectedFiles.length }} File{{ selectedFiles.length !== 1 ? 's' : '' }}
                </Button>
                <Button v-if="completed" @click="closeDialog">
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { fileImportService } from '@/services/file-import/FileImportService'
import { testDataApi } from '@/services/api-client'
import type { ImportProgress } from '@/services/file-import/types'

interface Props {
    open: boolean
    groupId: string
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const fileInput = ref<HTMLInputElement>()
const selectedFiles = ref<File[]>([])
const processing = ref(false)
const completed = ref(false)
const progress = ref<ImportProgress | null>(null)
const error = ref<string | null>(null)

// Computed
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

const supportedFileTypes = computed(() => fileImportService.getSupportedFileTypes())
const parserDisplayNames = computed(() => fileImportService.getParserDisplayNames())

const progressPercentage = computed(() => {
    if (!progress.value || progress.value.totalFiles === 0) return 0
    return Math.round((progress.value.processedFiles / progress.value.totalFiles) * 100)
})

const totalItemsCreated = computed(() => {
    if (!progress.value) return 0
    return progress.value.results.reduce((total, result) => {
        return total + (result.items?.length || 0)
    }, 0)
})

// File selection
const onFilesSelected = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
        selectedFiles.value = Array.from(target.files)
    }
}

// Import process
const startImport = async () => {
    if (selectedFiles.value.length === 0) return

    processing.value = true
    completed.value = false
    error.value = null

    try {
        // Process files
        const importProgress = await fileImportService.processFiles(
            selectedFiles.value,
            (updatedProgress) => {
                // Force reactivity by creating a new object
                progress.value = { ...updatedProgress }
            }
        )

        // Create bulk request for successful items
        const bulkRequest = fileImportService.createBulkRequest(importProgress.results)

        if (bulkRequest.items.length > 0) {
            const response = await testDataApi.groups.bulkCreateItems(props.groupId, bulkRequest)

            // Handle any creation errors
            if (response.errors.length > 0) {
                console.warn('Some items failed to create:', response.errors)
            }
            emit('success')
        }

        completed.value = true
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to import files'
    } finally {
        processing.value = false
    }
}

// Utility functions
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Dialog management
const closeDialog = () => {
    isOpen.value = false
}

// Reset state when dialog opens/closes
watch(() => props.open, (open) => {
    if (open) {
        // Reset state
        selectedFiles.value = []
        processing.value = false
        completed.value = false
        progress.value = null
        error.value = null

        // Reset file input
        if (fileInput.value) {
            fileInput.value.value = ''
        }
    }
})
</script>
