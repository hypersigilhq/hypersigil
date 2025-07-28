<template>
    <Dialog v-model:open="open">
        <DialogContent class="w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader class="flex-shrink-0 border-b pb-4">
                <DialogTitle>{{ file?.originalName }}</DialogTitle>
                <DialogDescription class="flex items-center gap-2">
                    <span>{{ file?.mimeType }} • {{ formatFileSize(file?.size || 0) }}</span>
                    <CopyToClipboard :text="file?.id!" />
                </DialogDescription>
            </DialogHeader>

            <div class="flex-1 overflow-hidden p-4">
                <!-- Loading state -->
                <div v-if="loading" class="flex items-center justify-center h-full">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>

                <!-- Error state -->
                <div v-else-if="error" class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <p class="text-destructive mb-2">{{ error }}</p>
                        <Button @click="loadFileContent" variant="outline">
                            Retry
                        </Button>
                    </div>
                </div>

                <!-- File content -->
                <div v-else-if="fileContent" class="h-full flex items-center justify-center">
                    <!-- PDF Viewer -->
                    <div v-if="isPdf && !isPdfTooLarge" class="w-full h-full">
                        <iframe :src="pdfDataUrl" class="w-full h-full border rounded" title="PDF Viewer" />
                    </div>

                    <!-- PDF Too Large -->
                    <div v-else-if="isPdf && isPdfTooLarge" class="text-center">
                        <div class="mb-4">
                            <svg class="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                </path>
                            </svg>
                        </div>
                        <h3 class="text-lg font-medium mb-2">PDF Too Large to Display</h3>
                        <p class="text-muted-foreground mb-4">
                            This PDF file is larger than 2MB (after encoding it to base64) and cannot be displayed in
                            the browser.
                        </p>
                        <p class="text-sm text-muted-foreground mb-4">
                            Base64 encoded file size: {{ formatFileSize(file?.data.length || 0) }}
                        </p>
                        <Button @click="downloadFile" variant="default">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                                </path>
                            </svg>
                            Download PDF
                        </Button>
                    </div>

                    <!-- Image Viewer -->
                    <div v-else-if="isImage" class="max-w-full max-h-full overflow-auto">
                        <img :src="imageDataUrl" :alt="file?.originalName"
                            class="max-w-full max-h-full object-contain" />
                    </div>

                    <!-- Unsupported file type -->
                    <div v-else class="text-center">
                        <p class="text-muted-foreground mb-4">
                            Preview not available for this file type
                        </p>
                        <p class="text-sm text-muted-foreground">
                            File type: {{ file?.mimeType }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Footer with file info -->
            <div class="flex-shrink-0 border-t pt-4 px-4 pb-4">
                <div class="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                        <span>Created: {{ formatDate(file?.created_at || '') }}</span>
                        <span class="ml-4">Updated: {{ formatDate(file?.updated_at || '') }}</span>
                    </div>
                    <div>
                        ID: {{ file?.id?.slice(0, 8) }}...
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FileResponse } from '@/services/definitions/file'
import { filesApi } from '@/services/api-client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import CopyToClipboard from '../ui/copy-to-clipboard/CopyToClipboard.vue'
import { formatFileSize } from '@/lib/utils'

interface Props {
    modelValue: boolean
    file: FileResponse | null
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

const open = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

// State
const loading = ref(false)
const error = ref<string | null>(null)
const fileContent = ref<FileResponse | null>(null)

// Computed properties for file type detection
const isPdf = computed(() => {
    return fileContent.value?.mimeType === 'application/pdf'
})

const isImage = computed(() => {
    return fileContent.value?.mimeType?.startsWith('image/') || false
})

const isPdfTooLarge = computed(() => {
    const maxPdfSize = 2 * 1024 * 1024 // 2MB in bytes
    return isPdf.value && (props.file?.data.length || 0) > maxPdfSize
})

const pdfDataUrl = computed(() => {
    if (!isPdf.value || !fileContent.value?.data || isPdfTooLarge.value) return ''
    return `data:application/pdf;base64,${fileContent.value.data}`
})

const imageDataUrl = computed(() => {
    if (!isImage.value || !fileContent.value?.data) return ''
    return `data:${fileContent.value.mimeType};base64,${fileContent.value.data}`
})

const downloadUrl = computed(() => {
    if (!fileContent.value?.data) return ''
    return `data:${fileContent.value.mimeType};base64,${fileContent.value.data}`
})

// Load file content with base64 data
const loadFileContent = async () => {
    if (!props.file?.id) return

    loading.value = true
    error.value = null

    try {
        const response = await filesApi.getById(props.file.id)
        fileContent.value = response
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load file content'
    } finally {
        loading.value = false
    }
}

// Download file function
const downloadFile = () => {
    if (!downloadUrl.value || !props.file) return

    const link = document.createElement('a')
    link.href = downloadUrl.value
    link.download = props.file.originalName || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// Utility functions
const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Watch for file changes and load content
watch(() => props.file, (newFile) => {
    if (newFile && props.modelValue) {
        loadFileContent()
    }
}, { immediate: true })

// Load content when dialog opens
watch(() => props.modelValue, (isOpen) => {
    if (isOpen && props.file) {
        loadFileContent()
    } else if (!isOpen) {
        // Clear content when dialog closes to free memory
        fileContent.value = null
        error.value = null
    }
})
</script>
