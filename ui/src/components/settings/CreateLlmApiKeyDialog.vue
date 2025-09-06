<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Add LLM API Key</DialogTitle>
                <DialogDescription>
                    Add an API key for an AI provider to enable model execution.
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="space-y-2">
                    <Label for="provider">Provider</Label>
                    <Select v-model="formData.provider" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                            <SelectItem value="ollama">Ollama</SelectItem>
                            <SelectItem value="gemini">Gemini</SelectItem>
                            <SelectItem value="deepseek">DeepSeek</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div class="space-y-2" v-if="!['ollama'].includes(formData.provider)">
                    <Label for="api_key">API Key</Label>
                    <Input id="api_key" v-model="formData.api_key" type="password" placeholder="Enter your API key"
                        required />
                    <p class="text-xs text-muted-foreground">
                        Your API key will be stored securely and used for AI model requests.
                    </p>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="$emit('update:open', false)">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="loading">
                        {{ loading ? 'Adding...' : 'Add API Key' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { settingsApi } from '@/services/api-client'
import type { CreateLlmApiKeySettingsRequest } from '@/services/definitions/settings'
import { useUI } from '@/services/ui'

interface Props {
    open: boolean
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'created'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { toast } = useUI()

const loading = ref(false)
const formData = reactive<CreateLlmApiKeySettingsRequest>({
    provider: '' as any,
    api_key: ''
})

const resetForm = () => {
    formData.provider = '' as any
    formData.api_key = ''
}

const handleSubmit = async () => {

    if (['ollama'].includes(formData.provider)) {
        formData.api_key = 'foobar'
    }

    if (!formData.provider || !formData.api_key) {
        toast({
            title: 'Validation Error',
            description: 'Please fill in all required fields',
            variant: 'warning'
        })
        return
    }

    try {
        loading.value = true
        await settingsApi.create({
            type: 'llm-api-key',
            data: formData
        })

        toast({
            title: 'Success',
            description: 'LLM API key added successfully'
        })

        emit('created')
        emit('update:open', false)
        resetForm()
    } catch (error) {
        console.error('Failed to create LLM API key:', error)
        toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to add API key',
            variant: 'error'
        })
    } finally {
        loading.value = false
    }
}

// Reset form when dialog closes
watch(() => props.open, (newOpen) => {
    if (!newOpen) {
        resetForm()
    }
})
</script>
