<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-7xl">
            <DialogHeader>
                <DialogTitle>
                    {{ isCloning ? 'Clone Execution' : 'Schedule Execution' }}
                </DialogTitle>
                <DialogDescription>
                    <span v-if="isCloning">
                        Create a new execution based on execution: {{ sourceExecutionId }}
                    </span>
                    <span v-else-if="promptName">
                        Schedule execution for prompt: {{ promptName }}
                    </span>
                    <span v-else>
                        Schedule a new execution
                    </span>
                </DialogDescription>
            </DialogHeader>

            <div v-if="successMessage" class="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
                <p class="text-sm text-green-800">{{ successMessage }}</p>
            </div>

            <form @submit.prevent="submitScheduleExecution" class="space-y-4">
                <div>
                    <Label for="userInput">User Input</Label>
                    <Textarea id="userInput" v-model="formData.userInput"
                        placeholder="Enter the input text to process with this prompt" rows="12" required />
                </div>

                <div>
                    <Label for="providerModel">Provider/Model</Label>
                    <Select v-model="formData.providerModel" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select provider and model" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-if="loadingModels" value="loading" disabled>
                                Loading models...
                            </SelectItem>
                            <SelectItem v-else-if="modelOptions.length === 0" value="no-models" disabled>
                                No models available
                            </SelectItem>
                            <template v-else v-for="(models, provider) in availableModels" :key="provider">
                                <SelectItem v-for="model in models" :key="`${provider}:${model}`"
                                    :value="`${provider}:${model}`">
                                    {{ provider }}: {{ model }}
                                </SelectItem>
                            </template>
                        </SelectContent>
                    </Select>
                </div>

                <div class="space-y-3">
                    <Label>Execution Options (Optional)</Label>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <Label for="temperature" class="text-sm">Temperature</Label>
                            <Input id="temperature" type="number" step="0.01" min="0" max="2"
                                v-model.number="formData.options.temperature" placeholder="0.01" />
                        </div>
                        <div>
                            <Label for="maxTokens" class="text-sm">Max Tokens</Label>
                            <Input id="maxTokens" type="number" min="1" v-model.number="formData.options.maxTokens"
                                placeholder="Auto" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <Label for="topP" class="text-sm">Top P</Label>
                            <Input id="topP" type="number" step="0.01" min="0" max="1"
                                v-model.number="formData.options.topP" placeholder="Auto" />
                        </div>
                        <div>
                            <Label for="topK" class="text-sm">Top K</Label>
                            <Input id="topK" type="number" min="1" v-model.number="formData.options.topK"
                                placeholder="Auto" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="closeDialog">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="submitting || loadingModels">
                        {{ submitting ? 'Scheduling...' : (isCloning ? 'Clone Execution' : 'Schedule Execution') }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { executionsApi } from '@/services/api-client'

// Props
interface Props {
    open: boolean
    promptId?: string
    promptName?: string
    // For cloning - pre-populate with existing execution data
    initialData?: {
        userInput: string
        providerModel: string
        options?: {
            temperature?: number
            maxTokens?: number
            topP?: number
            topK?: number
        }
    }
    sourceExecutionId?: string
}

// Emits
interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success', executionId: string): void
}

const props = withDefaults(defineProps<Props>(), {
    open: false
})

const emit = defineEmits<Emits>()

// Reactive state
const submitting = ref(false)
const loadingModels = ref(false)
const availableModels = ref<Record<string, string[]>>({})
const successMessage = ref<string | null>(null)

// Form data
const formData = reactive({
    userInput: '',
    providerModel: '',
    options: {
        temperature: 0.01,
        maxTokens: undefined as number | undefined,
        topP: undefined as number | undefined,
        topK: undefined as number | undefined
    }
})

// Computed properties
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

const isCloning = computed(() => !!props.sourceExecutionId)

const modelOptions = computed(() => {
    const options: Array<{ value: string; label: string; provider: string }> = []
    for (const [provider, models] of Object.entries(availableModels.value)) {
        for (const model of models) {
            options.push({
                value: `${provider}:${model}`,
                label: `${provider}: ${model}`,
                provider
            })
        }
    }
    return options
})

// Methods
const loadModels = async () => {
    loadingModels.value = true
    try {
        availableModels.value = await executionsApi.getAvailableModels()
    } catch (err) {
        console.error('Failed to load models:', err)
    } finally {
        loadingModels.value = false
    }
}

const resetForm = () => {
    formData.userInput = ''
    formData.providerModel = ''
    formData.options.temperature = 0.7
    formData.options.maxTokens = undefined
    formData.options.topP = 1
    formData.options.topK = 50
    successMessage.value = null
}

const populateForm = () => {
    if (props.initialData) {
        formData.userInput = props.initialData.userInput
        formData.providerModel = props.initialData.providerModel
        if (props.initialData.options) {
            formData.options.temperature = props.initialData.options.temperature ?? 0.01
            formData.options.maxTokens = props.initialData.options.maxTokens
            formData.options.topP = props.initialData.options.topP
            formData.options.topK = props.initialData.options.topK
        }
    } else {
        resetForm()
    }
}

const closeDialog = () => {
    isOpen.value = false
    successMessage.value = null
}

const submitScheduleExecution = async () => {
    if (!props.promptId) {
        console.error('No prompt ID provided')
        return
    }

    submitting.value = true
    successMessage.value = null

    try {
        const options: Record<string, any> = {}
        if (formData.options.temperature !== undefined) {
            options.temperature = formData.options.temperature
        }
        if (formData.options.maxTokens !== undefined) {
            options.maxTokens = formData.options.maxTokens
        }
        if (formData.options.topP !== undefined) {
            options.topP = formData.options.topP
        }
        if (formData.options.topK !== undefined) {
            options.topK = formData.options.topK
        }

        const execution = await executionsApi.create({
            promptId: props.promptId,
            userInput: formData.userInput,
            providerModel: formData.providerModel,
            options: Object.keys(options).length > 0 ? options : undefined
        })

        successMessage.value = `Execution ${isCloning.value ? 'cloned' : 'scheduled'} successfully! Execution ID: ${execution.id}`
        emit('success', execution.id)
    } catch (err) {
        console.error('Failed to schedule execution:', err)
    } finally {
        submitting.value = false
    }
}

// Watchers
watch(() => props.open, (newValue) => {
    if (newValue) {
        loadModels()
        populateForm()
    }
})
</script>
