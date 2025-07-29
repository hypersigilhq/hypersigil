<template>
    <div class="space-y-4">
        <div>
            <Label v-if="props.label !== ''" for="prompt">{{ label }}</Label>
            <Select v-model="selectedPromptId" required>
                <SelectTrigger>
                    <SelectValue placeholder="Select a prompt" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem v-if="loadingPrompts" value="loading" disabled>
                        Loading prompts...
                    </SelectItem>
                    <SelectItem v-if="nullOption" :value="null">
                        All
                    </SelectItem>
                    <SelectItem v-for="prompt in prompts" :key="prompt.id" :value="prompt.id">
                        {{ prompt.name }}
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div v-if="selectedPrompt && selectedPrompt.versions.length > 0">
            <Label for="version">Version (required)</Label>
            <Select v-model="selectedVersion" required>
                <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem v-for="version in selectedPrompt.versions" :key="version.version"
                        :value="version.version">
                        v{{ version.version }} - {{ version.name }} ({{ formatDate(version.date) }})
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { promptsApi } from '@/services/api-client'
import type { PromptSelectListResponse } from '@/services/definitions/prompt'

interface Props {
    modelValue?: string,
    versionValue?: number,
    label?: string,
    nullOption?: boolean,
}

interface Emits {
    (e: 'update:modelValue', value: string): void
    (e: 'update:versionValue', value: number | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
    label: "Prompt (required)"
})

const emit = defineEmits<Emits>()

const selectedPromptId = ref(props.modelValue || '')
const selectedVersion = ref<number | undefined>(props.versionValue)
const prompts = ref<PromptSelectListResponse['items']>([])
const loadingPrompts = ref(false)

const selectedPrompt = computed(() => {
    return prompts.value.find(prompt => prompt.id === selectedPromptId.value)
})

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
}

const loadPrompts = async () => {
    loadingPrompts.value = true
    try {
        const response = await promptsApi.selectList()
        prompts.value = response.items
    } catch (err) {
        console.error('Failed to load prompts:', err)
    } finally {
        loadingPrompts.value = false
    }
}

watch(selectedPromptId, (newValue) => {
    emit('update:modelValue', newValue)
    // Reset version when prompt changes
    selectedVersion.value = undefined
    emit('update:versionValue', undefined)
})

watch(selectedVersion, (newValue) => {
    emit('update:versionValue', newValue)
})

watch(() => props.modelValue, (newValue) => {
    if (newValue !== selectedPromptId.value) {
        selectedPromptId.value = newValue || ''
    }
})

watch(() => props.versionValue, (newValue) => {
    if (newValue !== selectedVersion.value) {
        selectedVersion.value = newValue
    }
})

onMounted(() => {
    loadPrompts()
})
</script>
