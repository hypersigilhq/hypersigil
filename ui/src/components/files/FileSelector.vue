<template>
    <div class="relative">
        <Label v-if="props.label !== ''" for="file">{{ label }}</Label>
        <div class="relative">
            <!-- Show pill when file is selected -->
            <div v-if="selectedFile" class="flex items-center gap-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                <div class="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    <span class="truncate max-w-48">{{ selectedFile.name }}</span>
                    <button @click="clearSelection" class="ml-1 hover:bg-blue-200 rounded-full p-0.5" type="button">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{{ formatFileSize(selectedFile.size) }}</span>
                    <span>{{ selectedFile.mimeType.split('/')[1]?.toUpperCase() || selectedFile.mimeType }}</span>
                </div>
            </div>

            <!-- Show input when no file is selected -->
            <div v-else>
                <Input v-model="searchQuery" placeholder="Search and select a file..." class="w-full"
                    @input="debouncedSearch" @focus="showDropdown = true" @blur="handleBlur" @keydown="handleKeydown" />
                <div v-if="showDropdown"
                    class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div v-if="loadingFiles" class="px-3 py-2 text-sm text-gray-500">
                        Loading files...
                    </div>
                    <div v-else-if="filteredFiles.length === 0" class="px-3 py-2 text-sm text-gray-500">
                        No files found
                    </div>
                    <div v-else>
                        <div v-if="nullOption" class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                            :class="{ 'bg-blue-50': highlightedIndex === -1 }" @mousedown.prevent="selectFile(null)"
                            @mouseenter="highlightedIndex = -1">
                            All
                        </div>
                        <div v-for="(file, index) in filteredFiles" :key="file.id"
                            class="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                            :class="{ 'bg-blue-50': highlightedIndex === index }" @mousedown.prevent="selectFile(file)"
                            @mouseenter="highlightedIndex = index">
                            <div class="flex items-center justify-between w-full">
                                <span class="truncate">{{ file.name }}</span>
                                <div class="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                                    <span>{{ formatFileSize(file.size) }}</span>
                                    <span>{{ file.mimeType.split('/')[1]?.toUpperCase() || file.mimeType }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { filesApi } from '@/services/api-client'
import type { FileSelectListResponse } from '@/services/definitions/file'
import { formatFileSize } from '@/lib/utils'

interface Props {
    modelValue?: string,
    label?: string,
    nullOption?: boolean,
    preselectedFileId?: string,
}

interface Emits {
    (e: 'update:modelValue', value: string): void
    (e: 'fileSelected', file: { id: string; name: string; originalName: string; mimeType: string; size: number } | null): void
}

const props = withDefaults(defineProps<Props>(), {
    label: "File (required)"
})

const emit = defineEmits<Emits>()

const selectedFileId = ref(props.modelValue || props.preselectedFileId || '')
const files = ref<FileSelectListResponse['items']>([])
const loadingFiles = ref(false)
const searchQuery = ref('')
const showDropdown = ref(false)
const highlightedIndex = ref(-1)

// Computed property for selected file
const selectedFile = computed(() => {
    return files.value.find(file => file.id === selectedFileId.value) || null
})

// Debounced search functionality
let searchTimeout: NodeJS.Timeout | null = null
const debouncedSearch = () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout)
    }
    searchTimeout = setTimeout(() => {
        // Reset highlighted index when searching
        highlightedIndex.value = -1
    }, 300)
}

// Computed property for filtered files based on search query
const filteredFiles = computed(() => {
    if (!searchQuery.value.trim()) {
        return files.value
    }

    const query = searchQuery.value.toLowerCase()
    return files.value.filter(file =>
        file.name.toLowerCase().includes(query) ||
        file.originalName.toLowerCase().includes(query) ||
        file.mimeType.toLowerCase().includes(query)
    )
})

const selectFile = (file: FileSelectListResponse['items'][0] | null) => {
    if (file) {
        selectedFileId.value = file.id
    } else {
        selectedFileId.value = ''
    }
    searchQuery.value = ''
    showDropdown.value = false
    highlightedIndex.value = -1
}

const clearSelection = () => {
    selectedFileId.value = ''
    searchQuery.value = ''
    emit('update:modelValue', '')
    emit('fileSelected', null)
}

const handleBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
        showDropdown.value = false
        // Reset search query when no file is selected
        if (!selectedFile.value) {
            searchQuery.value = ''
        }
    }, 150)
}

const handleKeydown = (event: KeyboardEvent) => {
    if (!showDropdown.value) return

    const totalItems = filteredFiles.value.length + (props.nullOption ? 1 : 0)

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            highlightedIndex.value = Math.min(highlightedIndex.value + 1, totalItems - 1)
            break
        case 'ArrowUp':
            event.preventDefault()
            highlightedIndex.value = Math.max(highlightedIndex.value - 1, props.nullOption ? -1 : 0)
            break
        case 'Enter':
            event.preventDefault()
            if (highlightedIndex.value === -1 && props.nullOption) {
                selectFile(null)
            } else if (highlightedIndex.value >= 0) {
                const adjustedIndex = props.nullOption ? highlightedIndex.value : highlightedIndex.value
                const fileIndex = props.nullOption ? adjustedIndex - 1 : adjustedIndex
                if (fileIndex >= 0 && fileIndex < filteredFiles.value.length) {
                    selectFile(filteredFiles.value[fileIndex])
                }
            }
            break
        case 'Escape':
            event.preventDefault()
            showDropdown.value = false
            break
    }
}

const loadFiles = async () => {
    loadingFiles.value = true
    try {
        const response = await filesApi.selectList()
        files.value = response.items
    } catch (err) {
        console.error('Failed to load files:', err)
    } finally {
        loadingFiles.value = false
    }
}

watch(selectedFileId, (newValue) => {
    emit('update:modelValue', newValue)

    // Emit file selected event with metadata
    const selectedFile = files.value.find(file => file.id === newValue)
    emit('fileSelected', selectedFile || null)
})

watch(() => props.modelValue, (newValue) => {
    if (newValue !== selectedFileId.value) {
        selectedFileId.value = newValue || ''
        // Keep search query empty when file is selected (pill will show instead)
        searchQuery.value = ''
    }
})

watch(() => props.preselectedFileId, (newValue) => {
    if (newValue && newValue !== selectedFileId.value && !props.modelValue) {
        selectedFileId.value = newValue
        // Keep search query empty when file is selected (pill will show instead)
        searchQuery.value = ''
    }
})

onMounted(() => {
    loadFiles()
})
</script>
