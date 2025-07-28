<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
                <DialogDescription>
                    Select multiple files to upload. Files will be converted to base64 format.
                </DialogDescription>
            </DialogHeader>

            <div class="flex-1 overflow-hidden flex flex-col space-y-4">
                <!-- File Selection Area -->
                <div class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Input type="file" ref="fileInput" @change="handleFileSelect" multiple class="hidden"
                        id="file-upload" />
                    <Label for="file-upload"
                        class="cursor-pointer flex flex-col items-center space-y-2 hover:text-primary transition-colors">
                        <Upload class="w-8 h-8" />
                        <span class="text-sm font-medium">Click to select files or drag and drop</span>
                        <span class="text-xs text-muted-foreground">Multiple files supported</span>
                    </Label>
                </div>

                <!-- File List -->
                <div v-if="fileQueue.length > 0" class="flex-1 overflow-hidden flex flex-col">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-sm font-medium">Files to upload ({{ fileQueue.length }})</h4>
                        <Button variant="outline" size="sm" @click="clearQueue" :disabled="isUploading">
                            Clear All
                        </Button>
                    </div>

                    <div class="flex-1 overflow-y-auto border rounded-lg">
                        <div class="space-y-2 p-3">
                            <div v-for="(fileItem, index) in fileQueue" :key="index"
                                class="flex items-center space-x-3 p-3 border rounded-lg bg-card">
                                <!-- Status Icon -->
                                <div class="flex-shrink-0">
                                    <div v-if="fileItem.status === 'pending'"
                                        class="w-4 h-4 rounded-full bg-muted-foreground/30"></div>
                                    <div v-else-if="fileItem.status === 'uploading'" class="w-4 h-4">
                                        <div
                                            class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent">
                                        </div>
                                    </div>
                                    <div v-else-if="fileItem.status === 'completed'"
                                        class="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                        <Check class="w-3 h-3 text-white" />
                                    </div>
                                    <div v-else-if="fileItem.status === 'error'"
                                        class="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                        <X class="w-3 h-3 text-white" />
                                    </div>
                                </div>

                                <!-- File Info -->
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center space-x-2">
                                        <p class="text-sm font-medium truncate">{{ fileItem.displayName ||
                                            fileItem.file.name }}</p>
                                        <span class="text-xs text-muted-foreground">{{
                                            formatFileSize(fileItem.file.size) }}</span>
                                    </div>

                                    <!-- Progress bar for uploading files -->
                                    <div v-if="fileItem.status === 'uploading'" class="mt-1">
                                        <div class="w-full bg-muted rounded-full h-1">
                                            <div class="bg-primary h-1 rounded-full transition-all duration-300"
                                                :style="{ width: '100%' }"></div>
                                        </div>
                                    </div>

                                    <!-- Error message -->
                                    <p v-if="fileItem.status === 'error' && fileItem.error"
                                        class="text-xs text-red-500 mt-1">
                                        {{ fileItem.error }}
                                    </p>

                                    <!-- Editable fields for pending files -->
                                    <div v-if="fileItem.status === 'pending'" class="mt-2 space-y-2">
                                        <Input v-model="fileItem.displayName" placeholder="Display name (optional)"
                                            class="text-xs h-7" />
                                        <Textarea v-model="fileItem.description" placeholder="Description (optional)"
                                            rows="2" class="text-xs resize-none" />
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div class="flex-shrink-0">
                                    <Button v-if="fileItem.status === 'pending'" variant="ghost" size="sm"
                                        @click="removeFromQueue(index)" :disabled="isUploading">
                                        <Trash2 class="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Upload Progress Summary -->
                <div v-if="isUploading || hasCompletedFiles" class="border-t pt-4">
                    <div class="flex items-center justify-between text-sm">
                        <span>Progress: {{ completedCount }}/{{ fileQueue.length }} files</span>
                        <span v-if="errorCount > 0" class="text-red-500">{{ errorCount }} failed</span>
                    </div>
                    <div class="w-full bg-muted rounded-full h-2 mt-2">
                        <div class="bg-primary h-2 rounded-full transition-all duration-300"
                            :style="{ width: `${(completedCount / fileQueue.length) * 100}%` }"></div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" @click="closeDialog">
                    {{ isUploading ? 'Close' : 'Cancel' }}
                </Button>
                <Button @click="uploadFiles" :disabled="fileQueue.length === 0 || isUploading || !hasPendingFiles">
                    {{ isUploading ? 'Uploading...' : `Upload ${pendingCount} Files` }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Upload, Check, X, Trash2 } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

import { filesApi } from '@/services/api-client'
import type { CreateFileRequest } from '../../services/definitions/file'
import { useUI } from '@/services/ui'

const { toast } = useUI()

// Props and emits
interface Props {
    open: boolean
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'uploaded'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// File upload status type
type FileUploadStatus = 'pending' | 'uploading' | 'completed' | 'error'

interface FileUploadItem {
    file: File
    displayName: string
    description: string
    status: FileUploadStatus
    error?: string
}

// Reactive state
const fileInput = ref<HTMLInputElement>()
const fileQueue = ref<FileUploadItem[]>([])
const isUploading = ref(false)

// Computed properties
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

const pendingCount = computed(() =>
    fileQueue.value.filter(item => item.status === 'pending').length
)

const completedCount = computed(() =>
    fileQueue.value.filter(item => item.status === 'completed').length
)

const errorCount = computed(() =>
    fileQueue.value.filter(item => item.status === 'error').length
)

const hasPendingFiles = computed(() => pendingCount.value > 0)
const hasCompletedFiles = computed(() => completedCount.value > 0)

// File selection
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        const newFiles = Array.from(target.files).map(file => ({
            file,
            displayName: file.name,
            description: '',
            status: 'pending' as FileUploadStatus
        }))

        fileQueue.value.push(...newFiles)

        // Clear the input so the same files can be selected again if needed
        target.value = ''
    }
}

// Queue management
const removeFromQueue = (index: number) => {
    fileQueue.value.splice(index, 1)
}

const clearQueue = () => {
    fileQueue.value = fileQueue.value.filter(item => item.status === 'uploading')
}

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
            const result = reader.result as string
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1]
            resolve(base64)
        }
        reader.onerror = error => reject(error)
    })
}

// Upload files
const uploadFiles = async () => {
    if (fileQueue.value.length === 0 || isUploading.value) return

    isUploading.value = true
    let successCount = 0
    let errorCount = 0

    // Process files sequentially to avoid overwhelming the server
    for (const fileItem of fileQueue.value) {
        if (fileItem.status !== 'pending') continue

        fileItem.status = 'uploading'

        try {
            const base64Data = await fileToBase64(fileItem.file)

            const fileData: CreateFileRequest = {
                name: fileItem.displayName || fileItem.file.name,
                originalName: fileItem.file.name,
                mimeType: fileItem.file.type || 'application/octet-stream',
                size: fileItem.file.size,
                data: base64Data,
                description: fileItem.description || undefined
            }

            await filesApi.create(fileData)
            fileItem.status = 'completed'
            successCount++
        } catch (err) {
            fileItem.status = 'error'
            fileItem.error = err instanceof Error ? err.message : 'Upload failed'
            errorCount++
        }
    }

    isUploading.value = false

    // Show summary toast
    if (successCount > 0) {
        toast({
            title: 'Upload Complete',
            variant: 'success',
            description: `${successCount} file${successCount === 1 ? '' : 's'} uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        })
        emit('uploaded')
    }

    if (errorCount > 0 && successCount === 0) {
        toast({
            title: 'Upload Failed',
            variant: 'error',
            description: `All ${errorCount} file${errorCount === 1 ? '' : 's'} failed to upload`
        })
    }
}

// Dialog management
const closeDialog = () => {
    if (!isUploading.value) {
        fileQueue.value = []
        if (fileInput.value) {
            fileInput.value.value = ''
        }
    }
    isOpen.value = false
}

// Utility functions
const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Reset queue when dialog closes
watch(isOpen, (newValue) => {
    if (!newValue && !isUploading.value) {
        fileQueue.value = []
    }
})
</script>
