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
                <!-- Prompt Selection (for item mode) -->
                <div v-if="mode === 'item'">
                    <Label for="prompt">Prompt (Required)</Label>
                    <Select v-model="formData.promptId" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a prompt" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-if="loadingPrompts" value="loading" disabled>
                                Loading prompts...
                            </SelectItem>
                            <SelectItem v-for="prompt in prompts" :key="prompt.id" :value="prompt.id">
                                {{ prompt.name }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Test Data Group Selection (for group mode) -->
                <div v-if="mode !== 'item'">
                    <Label for="testDataGroup">Test Data Group (Optional)</Label>
                    <Select v-model="formData.testDataGroupId">
                        <SelectTrigger>
                            <SelectValue placeholder="Select test data group or leave empty for manual input" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-if="loadingTestDataGroups" value="loading" disabled>
                                Loading test data groups...
                            </SelectItem>
                            <SelectItem v-for="group in testDataGroups" :key="group.id" :value="group.id">
                                {{ group.name }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div v-if="!formData.testDataGroupId">
                    <template v-if="multipleUserInputs">
                        <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p class="text-sm text-blue-800">
                                Multiple user input provided, will schedule {{ multipleUserInputs }} executions
                            </p>
                        </div>
                    </template>
                    <template v-else>
                        <Label for="userInput">User Input</Label>
                        <Textarea id="userInput" v-model="formData.userInput"
                            placeholder="Enter the input text to process with this prompt" rows="4" required />
                    </template>
                </div>

                <div v-else class="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p class="text-sm text-blue-800">
                        <strong>Test Data Group Selected:</strong> {{testDataGroups.find(g => g.id ===
                            formData.testDataGroupId)?.name}}
                    </p>
                    <p class="text-xs text-blue-600 mt-1">
                        The execution will run against all test data items in this group.
                        <Button @click="formData.testDataGroupId = ''">Switch to user input</Button>
                    </p>
                </div>

                <div>
                    <Label for="providerModel">Provider/Model (Select multiple)</Label>
                    <div class="border rounded-md p-3 min-h-[40px] bg-background">
                        <div v-if="loadingModels" class="text-sm text-muted-foreground">
                            Loading models...
                        </div>
                        <div v-else-if="modelOptions.length === 0" class="text-sm text-muted-foreground">
                            No models available
                        </div>
                        <div v-else class="space-y-2">
                            <div v-if="formData.providerModel.length > 0" class="flex flex-wrap gap-2 mb-3">
                                <div v-for="selectedModel in formData.providerModel" :key="selectedModel"
                                    class="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-sm">
                                    {{ selectedModel }}
                                    <button type="button" @click="removeModel(selectedModel)"
                                        class="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5">
                                        ×
                                    </button>
                                </div>
                            </div>

                            <!-- Search bar -->
                            <div class="mb-3">
                                <Input v-model="modelSearchQuery" placeholder="Search providers and models..."
                                    class="text-sm" @input="onSearchInput" />
                            </div>

                            <div class="max-h-48 overflow-y-auto space-y-1">
                                <template v-for="(models, provider) in filteredAvailableModels" :key="provider">
                                    <div v-for="model in models" :key="`${provider}:${model}`"
                                        class="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                                        @click="toggleModel(`${provider}:${model}`)">
                                        <input type="checkbox"
                                            :checked="formData.providerModel.includes(`${provider}:${model}`)"
                                            @change="toggleModel(`${provider}:${model}`)"
                                            class="rounded border-gray-300">
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
                    <div v-if="formData.providerModel.length === 0" class="text-sm text-red-500 mt-1">
                        Please select at least one provider/model
                    </div>
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
                    <Button type="submit"
                        :disabled="submitting || loadingModels || formData.providerModel.length === 0">
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

import { executionsApi, testDataApi, promptsApi } from '@/services/api-client'

// Props
interface Props {
    open: boolean
    mode?: 'group' | 'item'
    promptId?: string
    promptName?: string
    initialUserInput?: string[]
    // For cloning - pre-populate with existing execution data
    initialData?: {
        userInput: string
        providerModel: string[]
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
const loadingTestDataGroups = ref(false)
const loadingPrompts = ref(false)
const availableModels = ref<Record<string, string[]>>({})
const testDataGroups = ref<Array<{ id: string; name: string }>>([])
const prompts = ref<Array<{ id: string; name: string }>>([])
const successMessage = ref<string | null>(null)
const modelSearchQuery = ref('')

// Form data
const formData = reactive({
    promptId: '',
    userInput: '',
    userInputs: [] as string[],
    providerModel: <string[]>[],
    testDataGroupId: '',
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

const loadTestDataGroups = async () => {
    loadingTestDataGroups.value = true
    try {
        const response = await testDataApi.groups.selectList()
        testDataGroups.value = response.items
    } catch (err) {
        console.error('Failed to load test data groups:', err)
    } finally {
        loadingTestDataGroups.value = false
    }
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

const resetForm = () => {
    formData.userInput = ''
    formData.providerModel = []
    formData.testDataGroupId = ''
    formData.options.temperature = 0.7
    formData.options.maxTokens = undefined
    formData.options.topP = 1
    formData.options.topK = 50
    successMessage.value = null
    modelSearchQuery.value = ''
}

const multipleUserInputs = computed(() => {
    if (props.initialUserInput && props.initialUserInput.length > 1) {
        return props.initialUserInput.length
    }
    return 0
})

const populateForm = () => {
    if (props.initialData) {
        formData.userInput = props.initialData.userInput
        if (props.initialUserInput) {
            formData.userInputs = props.initialUserInput
        }
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

    // Handle item mode specific initialization
    if (props.mode === 'item') {
        if (props.initialUserInput) {
            formData.userInputs = props.initialUserInput
            formData.userInput = props.initialUserInput[0] || ''
        }
        // Clear test data group selection in item mode
        formData.testDataGroupId = ''
    }

    // Set prompt ID if provided
    if (props.promptId) {
        formData.promptId = props.promptId
    }
}

const toggleModel = (modelValue: string) => {
    const index = formData.providerModel.indexOf(modelValue)
    if (index > -1) {
        formData.providerModel.splice(index, 1)
    } else {
        formData.providerModel.push(modelValue)
    }
}

const removeModel = (modelValue: string) => {
    const index = formData.providerModel.indexOf(modelValue)
    if (index > -1) {
        formData.providerModel.splice(index, 1)
    }
}

const onSearchInput = () => {
    // The search filtering is handled by the computed property filteredAvailableModels
    // This method can be used for additional search-related logic if needed
}

const closeDialog = () => {
    isOpen.value = false
    successMessage.value = null
}

const submitScheduleExecution = async () => {
    // Determine which prompt ID to use based on mode
    const promptId = props.mode === 'item' ? formData.promptId : props.promptId

    if (!promptId) {
        console.error('No prompt ID provided')
        return
    }

    if (formData.providerModel.length === 0) {
        console.error('No provider/model selected')
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

        const executionData: any = {
            promptId: promptId,
            providerModel: formData.providerModel,
            options: Object.keys(options).length > 0 ? options : undefined
        }

        // Include testDataGroupId if selected, otherwise include userInput(s)
        if (formData.testDataGroupId) {
            executionData.testDataGroupId = formData.testDataGroupId
            executionData.userInput = formData.userInput
            const execution = await executionsApi.create(executionData)
            successMessage.value = `Execution ${isCloning.value ? 'cloned' : 'scheduled'} successfully! Execution IDs: ${execution.executionIds.join(', ')}`
            emit('success', execution.executionIds[0])
        } else if (multipleUserInputs.value) {
            // Create multiple executions for each user input
            const executions = await Promise.all(formData.userInputs.map(async (input) => {
                const data = { ...executionData, userInput: input }
                return executionsApi.create(data)
            }))

            const allExecutionIds = executions.flatMap(e => e.executionIds)
            successMessage.value = `${isCloning.value ? 'Cloned' : 'Scheduled'} ${allExecutionIds.length} executions successfully! Execution IDs: ${allExecutionIds.join(', ')}`
            emit('success', allExecutionIds[0])
        }

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
        if (props.mode === 'item') {
            loadPrompts()
        } else {
            loadTestDataGroups()
        }
        populateForm()
    }
})
</script>
