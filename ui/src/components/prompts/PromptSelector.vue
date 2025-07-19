<template>
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
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { promptsApi } from '@/services/api-client'
import Badge from '../ui/badge/Badge.vue'

interface Props {
    modelValue?: string,
    label?: string,
    nullOption?: boolean,
}

interface Emits {
    (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
    label: "Prompt (required)"
})

const emit = defineEmits<Emits>()

const selectedPromptId = ref(props.modelValue || '')
const prompts = ref<Array<{ id: string; name: string }>>([])
const loadingPrompts = ref(false)

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
})

watch(() => props.modelValue, (newValue) => {
    if (newValue !== selectedPromptId.value) {
        selectedPromptId.value = newValue || ''
    }
})

onMounted(() => {
    loadPrompts()
})
</script>
