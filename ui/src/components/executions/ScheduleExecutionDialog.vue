<template>
    <Dialog :open="isOpen" @update:open="(value) => emit('update:open', value)">
        <DialogContent class=" max-w-7xl h-screen m-0 p-2 rounded-none border-0 bg-background">
            <DialogHeader class="flex-shrink-0 border-b">
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
                <div v-if="successMessage" class="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
                    <p class="text-sm text-green-800">{{ successMessage }}</p>
                </div>

                <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                    <p class="text-sm text-red-800">{{ errorMessage }}</p>
                </div>
            </DialogHeader>

            <div class="flex-1 overflow-y-auto p-1">
                <form @submit.prevent="submitScheduleExecution" class="space-y-4">
                    <!-- Prompt Selection (for item mode) -->
                    <div v-if="mode === 'item'">
                        <PromptSelector v-model="formData.promptId" required />
                    </div>

                    <!-- Prompt Text Input (for text mode) -->
                    <div v-if="mode === 'text'">
                        <Label for="promptText">Prompt Text</Label>
                        <Textarea id="promptText" v-model="formData.promptText"
                            placeholder="Enter the prompt text to execute" rows="6" required />
                    </div>

                    <!-- File Selection (when prompt accepts file upload) -->
                    <div v-if="(promptId || formData.promptId) && promptData?.options?.acceptFileUpload">
                        <FileSelector v-model="formData.fileId" label="File" :preselected-file-id="formData.fileId" />
                    </div>

                    <!-- Test Data Group Selection (for group mode) -->
                    <div v-if="mode !== 'item' && mode !== 'text'">
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
                            <!-- Input mode toggle when JSON schema is available -->
                            <div v-if="hasJsonSchemaInput" class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <Label for="userInput">User Input</Label>
                                    <div class="flex items-center space-x-2">
                                        <Label for="inputMode" class="text-sm text-gray-600">Input Mode:</Label>
                                        <Select v-model="inputMode">
                                            <SelectTrigger class="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="schema">Structured Form</SelectItem>
                                                <SelectItem value="raw">Raw Text/JSON</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <!-- JSON Schema Form Mode -->
                                <div v-if="inputMode === 'schema'">
                                    <JsonSchemaForm :schema="promptData.json_schema_input" :hide-submit="true"
                                        v-model="formData.schemaFormData" @submit="handleSchemaFormSubmit"
                                        @error="handleSchemaFormError" class="border rounded-md p-4" />
                                    <div v-if="schemaFormErrors && Object.keys(schemaFormErrors).length > 0"
                                        class="mt-2">
                                        <p class="text-sm text-red-600">Please fix the form errors above before
                                            submitting.</p>
                                    </div>
                                </div>

                                <!-- Raw Text Input Mode -->
                                <div v-else>
                                    <Textarea id="userInput" v-model="formData.userInput"
                                        placeholder="Enter JSON or text input to process with this prompt" rows="4" />
                                    <p class="text-xs text-gray-500 mt-1">
                                        When using raw mode, ensure your input matches the expected schema format.
                                    </p>
                                </div>
                            </div>

                            <!-- Fallback to textarea when no JSON schema -->
                            <div v-else>
                                <Label for="userInput">User Input</Label>
                                <Textarea id="userInput" v-model="formData.userInput"
                                    placeholder="Enter the input text to process with this prompt" rows="4" />
                            </div>
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

                    <ModelSelector v-model="formData.providerModel" label="Provider/Model (Select multiple)"
                        :multiple="true" :supports-file-upload="promptData?.options?.acceptFileUpload === true"
                        :preselected-models="formData.providerModel" @selection-changed="onModelSelectionChanged" />

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
                </form>
            </div>

            <DialogFooter class="flex-shrink-0 border-t pt-4">
                <Button type="button" variant="outline" @click="closeDialog">
                    Cancel
                </Button>
                <Button type="button" variant="secondary" :disabled="previewDisabled" @click="showPreview">
                    {{ previewLoading ? 'Loading Preview...' : 'Preview Compiled Prompt' }}
                </Button>
                <Button type="submit" :disabled="scheduleExecutionDisabled" @click="submitScheduleExecution">
                    {{ submitting ? 'Scheduling...' : (isCloning ? 'Clone Execution' : 'Schedule Execution') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <!-- Preview Dialog -->
    <Dialog v-model:open="showPreviewDialog">
        <DialogContent class="max-w-6xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
                <DialogTitle>Compiled Prompt Preview</DialogTitle>
                <DialogDescription>
                    Preview of the prompt compiled with your user input
                </DialogDescription>
            </DialogHeader>

            <div class="flex-1 overflow-y-auto">
                <div v-if="previewError" class="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                    <p class="text-sm text-red-800">{{ previewError }}</p>
                </div>

                <div v-if="previewResult" class="space-y-4">
                    <div>
                        <Label class="text-sm font-medium">Compiled Prompt:</Label>
                        <div class="mt-2 p-4 bg-gray-50 border rounded-md max-h-96 overflow-y-auto">
                            <pre class="whitespace-pre-wrap text-sm">{{ previewResult }}</pre>
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" @click="showPreviewDialog = false">
                    Close
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'

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
import PromptSelector from '@/components/prompts/PromptSelector.vue'
import FileSelector from '@/components/files/FileSelector.vue'
import { ModelSelector } from '@/components/ui/model-selector'
import JsonSchemaForm from '@/components/ui/json-schema-form/JsonSchemaForm.vue'
import type { FormData as JsonFormData, FormErrors } from '@/components/ui/json-schema-form/types'

const router = useRouter()

// Props
interface Props {
    open: boolean
    mode?: 'group' | 'item' | 'text'
    promptId?: string
    promptName?: string
    initialPromptText?: string
    initialUserInput?: string[]
    // For cloning - pre-populate with existing execution data
    initialData?: {
        fileId?: string
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
const loadingTestDataGroups = ref(false)
const testDataGroups = ref<Array<{ id: string; name: string }>>([])
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const promptData = ref<any>(null)
const isInitializing = ref(false)

// JSON Schema Form state
const inputMode = ref<'schema' | 'raw'>('schema')
const schemaFormErrors = ref<FormErrors>({})

// Preview state
const showPreviewDialog = ref(false)
const previewLoading = ref(false)
const previewResult = ref<string | null>(null)
const previewError = ref<string | null>(null)

// Form data
const formData = reactive({
    promptId: '',
    promptText: '',
    userInput: '',
    userInputs: [] as string[],
    schemaFormData: {} as JsonFormData,
    providerModel: <string[]>[],
    testDataGroupId: '',
    fileId: '',
    options: {
        temperature: 0.01,
        maxTokens: undefined as number | undefined,
        topP: undefined as number | undefined,
        topK: undefined as number | undefined
    }
})

// Computed properties
const isOpen = computed(() => props.open)

const isCloning = computed(() => !!props.sourceExecutionId)

const scheduleExecutionDisabled = computed(() => {
    if (props.mode === 'text' && (!formData.promptText.trim())) {
        return true
    }

    return submitting.value || formData.providerModel.length === 0
})

const previewDisabled = computed(() => {
    if (previewLoading.value) return true

    // Check if we have user input
    const effectiveInput = getEffectiveUserInput()
    if (!effectiveInput.trim()) return true

    // Check for schema form validation errors
    if (hasJsonSchemaInput.value && inputMode.value === 'schema' && Object.keys(schemaFormErrors.value).length > 0) {
        return true
    }

    // Check if we have a prompt (either text or ID)
    if (props.mode === 'text') {
        return !formData.promptText.trim()
    } else {
        const promptId = props.mode === 'item' ? formData.promptId : props.promptId
        return !promptId
    }
})

// Methods
const loadPromptData = async (promptId: string) => {
    try {
        promptData.value = await promptsApi.getById(promptId)
    } catch (err) {
        console.error('Failed to load prompt data:', err)
        promptData.value = null
    }
}


const loadTestDataGroups = async () => {
    if (loadingTestDataGroups.value) return // Prevent multiple simultaneous calls

    loadingTestDataGroups.value = true
    try {
        const response = await testDataApi.groups.selectList()
        testDataGroups.value = response.items
    } catch (err) {
        console.error('Failed to load test data groups:', err)
        testDataGroups.value = []
    } finally {
        loadingTestDataGroups.value = false
    }
}

const resetForm = () => {
    formData.promptText = ''
    formData.userInput = ''
    formData.schemaFormData = {}
    formData.providerModel = []
    formData.testDataGroupId = ''
    formData.fileId = ''
    formData.options.temperature = 0.7
    formData.options.maxTokens = undefined
    formData.options.topP = 1
    formData.options.topK = 50
    successMessage.value = null
    errorMessage.value = null
    schemaFormErrors.value = {}
}

const hasJsonSchemaInput = computed(() => {
    return promptData.value?.json_schema_input && typeof promptData.value.json_schema_input === 'object'
})

const handleSchemaFormSubmit = (data: JsonFormData) => {
    // Convert form data to JSON string for userInput
    formData.userInput = JSON.stringify(data, null, 2)
}

const handleSchemaFormError = (errors: FormErrors) => {
    schemaFormErrors.value = errors
}

const getEffectiveUserInput = (): string => {
    if (hasJsonSchemaInput.value && inputMode.value === 'schema') {
        // Convert schema form data to JSON string
        return JSON.stringify(formData.schemaFormData, null, 2)
    }
    return formData.userInput
}

const multipleUserInputs = computed(() => {
    if (props.initialUserInput && props.initialUserInput.length > 1) {
        return props.initialUserInput.length
    }
    return 0
})

const populateForm = () => {
    if (props.initialData) {
        formData.fileId = props.initialData.fileId || ''
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

    if (props.mode === 'text') {
        if (props.initialPromptText) {
            formData.promptText = props.initialPromptText
        }
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


const onModelSelectionChanged = (models: string[]) => {
    // This method is called when the model selection changes
    // The formData.providerModel is already updated via v-model
}

const closeDialog = () => {
    emit('update:open', false)
    successMessage.value = null
    errorMessage.value = null
}

const showPreview = async () => {
    if (previewDisabled.value) return

    previewLoading.value = true
    previewError.value = null
    previewResult.value = null

    try {
        const previewData: any = {
            userInput: getEffectiveUserInput()
        }

        // Handle different modes
        if (props.mode === 'text') {
            previewData.promptText = formData.promptText
        } else {
            const promptId = props.mode === 'item' ? formData.promptId : props.promptId
            previewData.promptId = promptId
        }

        const response = await promptsApi.preview(previewData)
        previewResult.value = response.compiledPrompt
        showPreviewDialog.value = true
    } catch (err) {
        console.error('Failed to preview prompt:', err)
        previewError.value = `Failed to preview prompt: ${err}`
    } finally {
        showPreviewDialog.value = true
        previewLoading.value = false
    }
}

const submitScheduleExecution = async () => {
    // Validation based on mode
    if (props.mode === 'text') {
        if (!formData.promptText.trim()) {
            console.error('No prompt text provided')
            return
        }
    } else {
        // Determine which prompt ID to use based on mode
        const promptId = props.mode === 'item' ? formData.promptId : props.promptId
        if (!promptId) {
            console.error('No prompt ID provided')
            return
        }
    }

    if (formData.providerModel.length === 0) {
        console.error('No provider/model selected')
        return
    }

    // Check for schema form validation errors
    if (hasJsonSchemaInput.value && inputMode.value === 'schema' && Object.keys(schemaFormErrors.value).length > 0) {
        errorMessage.value = 'Please fix the form validation errors before submitting.'
        return
    }

    submitting.value = true
    successMessage.value = null
    errorMessage.value = null

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
            providerModel: formData.providerModel,
            options: Object.keys(options).length > 0 ? options : undefined
        }

        // Include fileId if selected
        if (formData.fileId) {
            executionData.fileId = formData.fileId
        }

        // Handle different modes
        if (props.mode === 'text') {
            // Text mode - use promptText instead of promptId
            executionData.promptText = formData.promptText
            executionData.userInput = formData.userInput
        } else {
            // Item/Group modes - use promptId
            const promptId = props.mode === 'item' ? formData.promptId : props.promptId
            executionData.promptId = promptId
        }

        if (formData.testDataGroupId && props.mode !== 'text') {
            // test data group selected (not available in text mode)
            executionData.testDataGroupId = formData.testDataGroupId
            const execution = await executionsApi.create(executionData)
            successMessage.value = `Execution ${isCloning.value ? 'cloned' : 'scheduled'} successfully! Execution IDs: ${execution.executionIds.join(', ')}`
            emit('success', execution.executionIds[0])
        } else if (multipleUserInputs.value && props.mode !== 'text') {
            // Create multiple executions for each user input (not available in text mode)
            const executions = await Promise.all(formData.userInputs.map(async (input) => {
                const data = { ...executionData, userInput: input }
                return executionsApi.create(data)
            }))

            const allExecutionIds = executions.flatMap(e => e.executionIds)
            successMessage.value = `${isCloning.value ? 'Cloned' : 'Scheduled'} ${allExecutionIds.length} executions successfully! Execution IDs: ${allExecutionIds.join(', ')}`
            emit('success', allExecutionIds[0])
        } else {
            // Single execution with user input
            if (props.mode !== 'text') {
                executionData.userInput = getEffectiveUserInput()
            }
            const execution = await executionsApi.create(executionData)
            successMessage.value = `Execution ${isCloning.value ? 'cloned' : 'scheduled'} successfully! Execution IDs: ${execution.executionIds.join(', ')}`
            emit('success', execution.executionIds[0])
        }

    } catch (err) {
        console.error('Failed to schedule execution:', err)
        errorMessage.value = `Failed to ${isCloning.value ? 'clone' : 'schedule'} execution. Please try again. Details: ` + err
    } finally {
        submitting.value = false
    }
}

// Watchers
watch(() => props.open, async (newValue) => {
    if (newValue && !isInitializing.value) {
        isInitializing.value = true

        await nextTick()

        try {
            // Load prompt data first if promptId is provided
            if (props.promptId) {
                await loadPromptData(props.promptId)
            }

            // Models are now loaded by the ModelSelector component

            if (props.mode !== 'item') {
                await loadTestDataGroups()
            }
            populateForm()
        } finally {
            isInitializing.value = false
        }
    }
})

// Watch for changes in formData.promptId (for item mode)
watch(() => formData.promptId, async (newPromptId) => {
    if (newPromptId && props.mode === 'item') {
        await loadPromptData(newPromptId)
        // Models are now loaded by the ModelSelector component
    }
})

// Watch for prompt data changes to set default input mode
watch(() => promptData.value, (newPromptData) => {
    if (newPromptData?.json_schema_input) {
        // Default to schema mode when JSON schema input is available
        inputMode.value = 'schema'
        formData.schemaFormData = {}
    } else {
        inputMode.value = 'raw'
    }
})

// Watch for input mode changes to sync data
watch(inputMode, (newMode) => {
    if (newMode === 'schema' && hasJsonSchemaInput.value) {
        // Clear raw input when switching to schema mode
        if (formData.userInput.trim()) {
            try {
                // Try to parse existing input as JSON to populate form
                const parsed = JSON.parse(formData.userInput)
                formData.schemaFormData = parsed
            } catch {
                // If parsing fails, start with empty form data
                formData.schemaFormData = {}
            }
        }
    } else if (newMode === 'raw') {
        // Convert schema form data to JSON string when switching to raw mode
        if (Object.keys(formData.schemaFormData).length > 0) {
            formData.userInput = JSON.stringify(formData.schemaFormData, null, 2)
        }
    }
})
</script>
