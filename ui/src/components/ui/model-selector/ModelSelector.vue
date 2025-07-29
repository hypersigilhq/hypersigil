<template>
    <div>
        <Label v-if="props.label !== ''" for="providerModel">{{ label }}</Label>

        <!-- Warning for no models available that support file upload -->
        <div v-if="showNoFileUploadModelsWarning" class="p-3 bg-orange-50 border border-orange-200 rounded-md mb-3">
            <p class="text-sm text-orange-800">
                No models are available that support file upload. This prompt requires file upload
                support but no configured providers support this feature.
            </p>
        </div>

        <!-- Warning for no models available (regular) -->
        <div v-else-if="showRegularNoModelsWarning" class="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-3">
            <p class="text-sm text-yellow-800">
                You need to add LLM API keys in Settings to enable model selection.
            </p>
        </div>

        <div v-else class="border rounded-md p-3 min-h-[40px] bg-background">
            <div v-if="loadingModels" class="text-sm text-muted-foreground">
                Loading models...
            </div>
            <div v-else class="space-y-2">
                <!-- Selected models display (for multiple selection) -->
                <div v-if="multiple && selectedModels.length > 0" class="flex flex-wrap gap-2 mb-3">
                    <div v-for="selectedModel in selectedModels" :key="selectedModel"
                        class="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-sm">
                        {{ selectedModel }}
                        <button type="button" @click="removeModel(selectedModel)"
                            class="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5">
                            ×
                        </button>
                    </div>
                </div>

                <!-- Selected model display (for single selection) -->
                <div v-else-if="!multiple && selectedModels.length > 0" class="mb-3">
                    <div
                        class="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-sm">
                        {{ selectedModels[0] }}
                        <button type="button" @click="clearSelection"
                            class="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5">
                            ×
                        </button>
                    </div>
                </div>

                <!-- Search bar -->
                <div class="mb-3">
                    <Input v-model="modelSearchQuery" placeholder="Search providers and models..." class="text-sm"
                        @input="onSearchInput" />
                </div>

                <div class="max-h-48 overflow-y-auto space-y-1">
                    <template v-for="(models, provider) in filteredAvailableModels" :key="provider">
                        <div v-for="model in models" :key="`${provider}:${model}`"
                            class="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                            :class="{ 'bg-muted': selectedModels.includes(`${provider}:${model}`) }"
                            @click.stop="toggleModel(`${provider}:${model}`)">
                            <label class="text-sm cursor-pointer flex-1">
                                {{ provider }}: {{ model }}
                            </label>
                        </div>
                    </template>
                    <div v-if="Object.keys(filteredAvailableModels).length === 0 && modelSearchQuery"
                        class="text-sm text-muted-foreground p-2 text-center">
                        No models found matching "{{ modelSearchQuery }}"
                    </div>
                </div>
            </div>
        </div>
        <div v-if="!showNoModelsWarning && selectedModels.length === 0" class="text-sm text-red-500 mt-1">
            Please select at least one provider/model
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { executionsApi } from '@/services/api-client'

interface Props {
    modelValue?: string | string[]
    label?: string
    multiple?: boolean
    supportsFileUpload?: boolean
    preselectedModels?: string[]
}

interface Emits {
    (e: 'update:modelValue', value: string | string[]): void
    (e: 'selection-changed', models: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
    label: "Provider/Model",
    multiple: true,
    supportsFileUpload: false,
    modelValue: () => []
})

const emit = defineEmits<Emits>()

// Reactive state
const loadingModels = ref(false)
const availableModels = ref<Record<string, string[]>>({})
const modelSearchQuery = ref('')
const selectedModels = ref<string[]>([])

// Initialize selected models from props
const initializeSelectedModels = () => {
    if (props.preselectedModels && props.preselectedModels.length > 0) {
        selectedModels.value = [...props.preselectedModels]
    } else if (props.modelValue) {
        if (Array.isArray(props.modelValue)) {
            selectedModels.value = [...props.modelValue]
        } else {
            selectedModels.value = [props.modelValue]
        }
    } else {
        selectedModels.value = []
    }
}

// Computed properties
const filteredAvailableModels = computed(() => {
    if (!modelSearchQuery.value.trim()) {
        return availableModels.value
    }

    const searchTerm = modelSearchQuery.value.toLowerCase()
    const filtered: Record<string, string[]> = {}

    for (const [provider, models] of Object.entries(availableModels.value)) {
        const filteredModels = models.filter(model =>
            provider.toLowerCase().includes(searchTerm) ||
            model.toLowerCase().includes(searchTerm) ||
            `${provider}:${model}`.toLowerCase().includes(searchTerm)
        )

        if (filteredModels.length > 0) {
            filtered[provider] = filteredModels
        }
    }

    return filtered
})

const showNoModelsWarning = computed(() => {
    return !loadingModels.value && Object.keys(availableModels.value).length === 0
})

const showNoFileUploadModelsWarning = computed(() => {
    return !loadingModels.value && Object.keys(availableModels.value).length === 0 && props.supportsFileUpload
})

const showRegularNoModelsWarning = computed(() => {
    return !loadingModels.value && Object.keys(availableModels.value).length === 0 && !props.supportsFileUpload
})

// Methods
const loadModels = async () => {
    loadingModels.value = true
    try {
        availableModels.value = await executionsApi.getAvailableModels({
            supportsFileUpload: props.supportsFileUpload
        })
    } catch (err) {
        console.error('Failed to load models:', err)
    } finally {
        loadingModels.value = false
    }
}

const toggleModel = (modelValue: string) => {
    if (props.multiple) {
        const index = selectedModels.value.indexOf(modelValue)
        if (index > -1) {
            selectedModels.value.splice(index, 1)
        } else {
            selectedModels.value.push(modelValue)
        }
    } else {
        // Single selection mode
        selectedModels.value = [modelValue]
    }
    emitChanges()
}

const removeModel = (modelValue: string) => {
    const index = selectedModels.value.indexOf(modelValue)
    if (index > -1) {
        selectedModels.value.splice(index, 1)
        emitChanges()
    }
}

const clearSelection = () => {
    selectedModels.value = []
    emitChanges()
}

const onSearchInput = () => {
    // The search filtering is handled by the computed property filteredAvailableModels
    // This method can be used for additional search-related logic if needed
}

const emitChanges = () => {
    const value = props.multiple ? selectedModels.value : (selectedModels.value[0] || '')
    emit('update:modelValue', value)
    emit('selection-changed', selectedModels.value)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
    const newSelectedModels = newValue ? (Array.isArray(newValue) ? [...newValue] : [newValue]) : []

    // Only update if the values are actually different to prevent recursive updates
    if (JSON.stringify(newSelectedModels.sort()) !== JSON.stringify(selectedModels.value.sort())) {
        selectedModels.value = newSelectedModels
    }
}, { deep: true })

watch(() => props.preselectedModels, (newValue) => {
    if (newValue && newValue.length > 0) {
        const newSelectedModels = [...newValue]

        // Only update if the values are actually different to prevent recursive updates
        if (JSON.stringify(newSelectedModels.sort()) !== JSON.stringify(selectedModels.value.sort())) {
            selectedModels.value = newSelectedModels
            emitChanges()
        }
    }
}, { deep: true })

watch(() => props.supportsFileUpload, () => {
    loadModels()
})

// Lifecycle
onMounted(() => {
    initializeSelectedModels()
    loadModels()
})
</script>
