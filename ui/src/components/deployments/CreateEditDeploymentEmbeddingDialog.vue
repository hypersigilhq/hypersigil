<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-4xl">
            <DialogHeader>
                <DialogTitle>
                    {{ deploymentEmbedding ? 'Edit Deployment Embedding' : 'Create New Deployment Embedding' }}
                </DialogTitle>
                <DialogDescription>
                    {{ deploymentEmbedding ? 'Update the deployment embedding details below.' : `Fill in the details to
                    create a new
                    deployment embedding.` }}
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="saveDeploymentEmbedding" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Left Column -->
                    <div class="space-y-4">
                        <div>
                            <Label for="name">Name</Label>
                            <Input id="name" v-model="formData.name" placeholder="deployment-embedding-name"
                                :disabled="!!deploymentEmbedding" required />
                            <p class="text-sm text-muted-foreground mt-1">
                                <span v-if="deploymentEmbedding">Name cannot be changed after creation</span>
                                <span v-else>Use lowercase letters, numbers, hyphens, and underscores only</span>
                            </p>
                        </div>

                        <div>
                            <Label for="model">Model</Label>
                            <Select v-model="formData.model" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select embedding model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="voyage-3-large">voyage-3-large</SelectItem>
                                    <SelectItem value="voyage-3.5">voyage-3.5</SelectItem>
                                    <SelectItem value="voyage-3.5-lite">voyage-3.5-lite</SelectItem>
                                    <SelectItem value="voyage-code-3">voyage-code-3</SelectItem>
                                    <SelectItem value="voyage-finance-2">voyage-finance-2</SelectItem>
                                    <SelectItem value="voyage-law-2">voyage-law-2</SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-sm text-muted-foreground mt-1">
                                Choose the embedding model to use
                            </p>
                        </div>

                        <div>
                            <Label for="inputType">Input Type (Optional)</Label>
                            <Select v-model="formData.inputType">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select input type (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="query">Query</SelectItem>
                                    <SelectItem value="document">Document</SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-sm text-muted-foreground mt-1">
                                Specify the type of input for optimization
                            </p>
                        </div>

                        <div>
                            <Label for="webhookDestination">Webhook Destination</Label>
                            <Select v-model="selectedWebhookDestination">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select webhook destination (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem v-for="destination in webhookDestinations" :key="destination.id"
                                        :value="destination.id">
                                        {{ destination.name }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-sm text-muted-foreground mt-1">
                                Webhook destination for execution notifications
                            </p>
                        </div>
                    </div>


                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="closeDialog">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="saving">
                        {{ saving ? 'Saving...' : (deploymentEmbedding ? 'Update' : 'Create') }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
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

import { deploymentEmbeddingsApi, settingsApi } from '@/services/api-client'
import type { DeploymentEmbeddingResponse, CreateDeploymentEmbeddingRequest, UpdateDeploymentEmbeddingRequest } from '../../services/definitions/deployment-embedding'
import type { WebhookDestinationSettings } from '../../services/definitions/settings'
import { useUI } from '@/services/ui'

interface Props {
    open: boolean
    deploymentEmbedding?: DeploymentEmbeddingResponse | null
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
const formData = reactive<{
    name: string
    model: NonNullable<CreateDeploymentEmbeddingRequest['model']>
    inputType: CreateDeploymentEmbeddingRequest['inputType']
    webhookDestinationIds: string[]
}>({
    name: '',
    model: 'voyage-3-large',
    inputType: undefined,
    webhookDestinationIds: []
})

// State
const saving = ref(false)
const webhookDestinations = ref<WebhookDestinationSettings[]>([])
const selectedWebhookDestination = ref<string>('none')

// Load webhook destinations for selection
const loadWebhookDestinations = async () => {
    try {
        const response = await settingsApi.listByType('webhook-destination')
        webhookDestinations.value = response.settings.filter(s => s.type === 'webhook-destination') as WebhookDestinationSettings[]
    } catch (err) {
        console.error('Failed to load webhook destinations:', err)
        toast({
            title: 'Error',
            description: 'Failed to load webhook destinations',
            variant: 'error'
        })
    }
}

// Initialize form data when deploymentEmbedding prop changes
const initializeForm = () => {
    if (props.deploymentEmbedding) {
        // Edit mode
        formData.name = props.deploymentEmbedding.name
        formData.model = props.deploymentEmbedding.model
        formData.inputType = props.deploymentEmbedding.inputType || undefined

        // Set the selected webhook destination (only single selection supported)
        selectedWebhookDestination.value = (props.deploymentEmbedding).webhookDestinationIds?.[0] || 'none'
    } else {
        // Create mode
        formData.name = ''
        formData.model = 'voyage-3-large'
        formData.inputType = undefined
        selectedWebhookDestination.value = 'none'
    }
}

// Save deployment embedding
const saveDeploymentEmbedding = async () => {
    saving.value = true

    const webhookDestination = selectedWebhookDestination.value

    try {
        if (props.deploymentEmbedding) {
            // Update existing deployment embedding (name cannot be updated)
            const updateData: UpdateDeploymentEmbeddingRequest = {
                model: formData.model,
                inputType: formData.inputType,
                webhookDestinationIds: webhookDestination === 'none' ? [] : [webhookDestination]
            }
            await deploymentEmbeddingsApi.update(props.deploymentEmbedding.id, updateData)
        } else {
            // Create new deployment embedding
            const createData: CreateDeploymentEmbeddingRequest = {
                name: formData.name,
                model: formData.model,
                inputType: formData.inputType,
                webhookDestinationIds: webhookDestination === 'none' ? [] : [webhookDestination]
            }
            await deploymentEmbeddingsApi.create(createData)
        }

        toast({
            title: 'Success',
            variant: 'success',
            description: `Deployment embedding ${props.deploymentEmbedding ? 'updated' : 'created'} successfully`
        })

        emit('success')
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save deployment embedding'
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
    loadWebhookDestinations()
})
</script>
