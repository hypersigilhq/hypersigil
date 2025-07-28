<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-2xl">
            <DialogHeader>
                <DialogTitle>
                    {{ deployment ? 'Edit Deployment' : 'Create New Deployment' }}
                </DialogTitle>
                <DialogDescription>
                    {{ deployment ? 'Update the deployment details below.' : `Fill in the details to create a new
                    deployment.` }}
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="saveDeployment" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Left Column -->
                    <div class="space-y-4">
                        <div>
                            <Label for="name">Name</Label>
                            <Input id="name" v-model="formData.name" placeholder="deployment-name"
                                :disabled="!!deployment" required />
                            <p class="text-sm text-muted-foreground mt-1">
                                <span v-if="deployment">Name cannot be changed after creation</span>
                                <span v-else>Use lowercase letters, numbers, hyphens, and underscores only</span>
                            </p>
                        </div>

                        <div>
                            <Label for="prompt">Prompt</Label>
                            <PromptSelector @update:model-value="(v) => formData.promptId = v"
                                v-model="formData.promptId" :label="'Choose prompt'" />
                        </div>

                        <div>
                            <Label for="provider">Provider</Label>
                            <Select v-model="formData.provider" @update:model-value="onProviderChange" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="anthropic">Anthropic</SelectItem>
                                    <SelectItem value="ollama">Ollama</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label for="model">Model</Label>
                            <Select v-model="formData.model" :disabled="!formData.provider || loadingModels" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem v-for="model in availableModels" :key="model" :value="model">
                                        {{ model }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <div v-if="loadingModels" class="text-sm text-muted-foreground mt-1">
                                Loading models...
                            </div>
                        </div>
                    </div>

                    <!-- Right Column - Options -->
                    <div class="space-y-4">
                        <div>
                            <Label>Deployment Options</Label>
                            <p class="text-sm text-muted-foreground mb-3">
                                Configure model parameters (optional)
                            </p>
                        </div>

                        <div>
                            <Label for="temperature">Temperature</Label>
                            <Input id="temperature" v-model.number="formData.options.temperature" type="number"
                                step="0.1" min="0" max="1" placeholder="0.7" />
                            <p class="text-sm text-muted-foreground mt-1">
                                Controls randomness (0.0 - 1.0)
                            </p>
                        </div>

                        <div>
                            <Label for="topP">Top P</Label>
                            <Input id="topP" v-model.number="formData.options.topP" type="number" step="0.1" min="0"
                                max="1" placeholder="0.9" />
                            <p class="text-sm text-muted-foreground mt-1">
                                Nucleus sampling (0.0 - 1.0)
                            </p>
                        </div>

                        <div>
                            <Label for="topK">Top K</Label>
                            <Input id="topK" v-model.number="formData.options.topK" type="number" min="1"
                                placeholder="40" />
                            <p class="text-sm text-muted-foreground mt-1">
                                Limits token choices (integer ≥ 1)
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="closeDialog">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="saving">
                        {{ saving ? 'Saving...' : (deployment ? 'Update' : 'Create') }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { deploymentsApi, promptsApi, executionsApi } from '@/services/api-client'
import type { DeploymentResponse, CreateDeploymentRequest, UpdateDeploymentRequest } from '../../services/definitions/deployment'
import type { PromptSelectListResponse } from '../../services/definitions/prompt'
import type { AIProviderNameDefinition } from '../../services/definitions/execution'
import { AIProviderNamesDefinition } from '../../services/definitions/execution'
import { useUI } from '@/services/ui'
import PromptSelector from '../prompts/PromptSelector.vue'

interface Props {
    open: boolean
    deployment?: DeploymentResponse | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { toast } = useUI()

// Computed for dialog open state
const isOpen = computed({
    get: () => props.open,
    set: (value: boolean) => emit('update:open', value)
})

// Form data
const formData = reactive<CreateDeploymentRequest & { options: NonNullable<CreateDeploymentRequest['options']> }>({
    name: '',
    promptId: '',
    provider: '' as AIProviderNameDefinition,
    model: '',
    options: {
        temperature: undefined,
        topP: undefined,
        topK: undefined
    }
})

// State
const saving = ref(false)
const prompts = ref<PromptSelectListResponse['items']>([])
const availableModels = ref<string[]>([])
const loadingModels = ref(false)

// Load prompts for selection
const loadPrompts = async () => {
    try {
        const response = await promptsApi.selectList()
        prompts.value = response.items
    } catch (err) {
        console.error('Failed to load prompts:', err)
        toast({
            title: 'Error',
            description: 'Failed to load prompts',
            variant: 'error'
        })
    }
}

// Load available models for selected provider
const loadAvailableModels = async (provider: AIProviderNameDefinition) => {
    if (!provider) return

    loadingModels.value = true
    try {
        const response = await executionsApi.getAvailableModels({})
        availableModels.value = response[provider] || []

        // Reset model selection if current model is not available
        if (formData.model && !availableModels.value.includes(formData.model)) {
            formData.model = ''
        }
    } catch (err) {
        console.error('Failed to load models:', err)
        availableModels.value = []
        toast({
            title: 'Error',
            description: 'Failed to load available models',
            variant: 'error'
        })
    } finally {
        loadingModels.value = false
    }
}

// Handle provider change
const onProviderChange = () => {
    formData.model = '' // Reset model when provider changes
    if (formData.provider && AIProviderNamesDefinition.includes(formData.provider as AIProviderNameDefinition)) {
        loadAvailableModels(formData.provider as AIProviderNameDefinition)
    } else {
        availableModels.value = []
    }
}

// Initialize form data when deployment prop changes
const initializeForm = () => {
    if (props.deployment) {
        // Edit mode
        formData.name = props.deployment.name
        formData.promptId = props.deployment.promptId
        formData.provider = props.deployment.provider
        formData.model = props.deployment.model
        formData.options = {
            temperature: props.deployment.options?.temperature,
            topP: props.deployment.options?.topP,
            topK: props.deployment.options?.topK
        }

        // Load models for the current provider
        if (props.deployment.provider) {
            loadAvailableModels(props.deployment.provider)
        }
    } else {
        // Create mode
        formData.name = ''
        formData.promptId = ''
        formData.provider = '' as AIProviderNameDefinition
        formData.model = ''
        formData.options = {
            temperature: undefined,
            topP: undefined,
            topK: undefined
        }
        availableModels.value = []
    }
}

// Save deployment
const saveDeployment = async () => {
    saving.value = true

    try {
        // Prepare the request data
        const requestData: CreateDeploymentRequest | UpdateDeploymentRequest = {
            name: formData.name,
            promptId: formData.promptId,
            provider: formData.provider,
            model: formData.model,
            options: {
                ...(formData.options.temperature !== undefined && { temperature: formData.options.temperature }),
                ...(formData.options.topP !== undefined && { topP: formData.options.topP }),
                ...(formData.options.topK !== undefined && { topK: formData.options.topK })
            }
        }

        // Remove empty options object
        if (Object.keys(requestData.options || {}).length === 0) {
            delete requestData.options
        }

        if (props.deployment) {
            // Update existing deployment (name cannot be updated)
            const updateData: UpdateDeploymentRequest = { ...requestData }
            delete (updateData as any).name // Remove name from update request
            await deploymentsApi.update(props.deployment.id, updateData)
        } else {
            // Create new deployment
            await deploymentsApi.create(requestData as CreateDeploymentRequest)
        }

        toast({
            title: 'Success',
            variant: 'success',
            description: `Deployment ${props.deployment ? 'updated' : 'created'} successfully`
        })

        emit('success')
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save deployment'
        toast({
            title: 'Error',
            description: errorMessage,
            variant: 'error'
        })
    } finally {
        saving.value = false
    }
}

// Close dialog
const closeDialog = () => {
    isOpen.value = false
}

// Watch for dialog open changes
watch(() => props.open, (newOpen) => {
    if (newOpen) {
        initializeForm()
    }
})

// Initialize
onMounted(() => {
    loadPrompts()
})
</script>
