<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-4xl w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
            <DialogHeader>
                <DialogTitle>
                    {{ editingPrompt ? 'Edit Prompt' : (cloningPrompt ? 'Clone Prompt' : 'Create New Prompt') }}
                </DialogTitle>
                <DialogDescription>
                    {{ editingPrompt ? 'Update the prompt details below.' : (cloningPrompt ? `Modify the
                    cloned prompt details below.` : 'Fill in the details to create a new prompt.') }}
                </DialogDescription>
            </DialogHeader>

            <div class="flex flex-col h-full overflow-hidden">
                <div class="grid grid-cols-2 gap-6 flex-1 min-h-0">
                    <!-- Left Column -->
                    <div class="flex flex-col h-full overflow-hidden">
                        <div class="flex-shrink-0">
                            <Label for="name">Name</Label>
                            <Input id="name" v-model="formData.name" placeholder="Enter prompt name" required />
                        </div>

                        <div class="flex-1 flex flex-col mt-2 min-h-0">
                            <Label for="prompt" class="flex-shrink-0">Prompt</Label>
                            <div class="flex-1 min-h-0 mt-2">
                                <TemplateSuggestion id="prompt" v-model="formData.prompt" :schema="inputSchema"
                                    placeholder="Enter your prompt text" class="h-full" required />
                            </div>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div class="flex flex-col h-full overflow-hidden">
                        <Tabs default-value="input-schema" class="w-full h-full flex flex-col">
                            <TabsList class="grid w-full grid-cols-3 flex-shrink-0">
                                <TabsTrigger value="input-schema">Input Schema</TabsTrigger>
                                <TabsTrigger value="output-schema">Output Schema</TabsTrigger>
                                <TabsTrigger value="options">Options</TabsTrigger>
                            </TabsList>

                            <TabsContent value="input-schema" class="flex-1 flex flex-col mt-6 overflow-hidden">
                                <div class="flex-shrink-0">
                                    <Label for="input-schema">JSON Schema Input</Label>
                                    <p class="text-sm text-muted-foreground mt-1">
                                        Define the expected input structure using the visual schema builder below.
                                    </p>
                                </div>
                                <div class="flex-1 mt-4 min-h-0 overflow-auto">
                                    <JsonSchemaBuilder v-model="inputSchema" />
                                </div>
                            </TabsContent>

                            <TabsContent value="output-schema" class="flex-1 flex flex-col mt-6 overflow-hidden">
                                <div class="flex-shrink-0">
                                    <Label for="output-schema">JSON Schema Response</Label>
                                    <p class="text-sm text-muted-foreground mt-1">
                                        Define the expected response structure using the visual schema builder below.
                                    </p>
                                </div>
                                <div class="flex-1 mt-4 min-h-0 overflow-auto">
                                    <JsonSchemaBuilder v-model="outputSchema" />
                                </div>
                            </TabsContent>

                            <TabsContent value="options" class="flex-1 flex flex-col mt-6 overflow-auto">
                                <div class="flex flex-col space-y-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex flex-col">
                                            <Label for="acceptFileUpload">Accept file upload</Label>
                                            <p class="text-sm text-muted-foreground mt-1">
                                                Enable file upload support for this prompt. When enabled, users can
                                                upload files as
                                                part of their input.
                                            </p>
                                        </div>
                                        <Switch id="acceptFileUpload"
                                            :model-value="formData.options?.acceptFileUpload || false"
                                            @update:model-value="(v: boolean) => {
                                                formData.options!.acceptFileUpload = v;
                                            }" />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <DialogFooter class="mt-6">
                    <Button type="button" variant="outline" @click="closeDialog">
                        Cancel
                    </Button>
                    <Button type="submit" @click="savePrompt" :disabled="saving">
                        {{ saving ? 'Saving...' : (editingPrompt ? 'Update' : 'Create') }}
                    </Button>
                </DialogFooter>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import Switch from '@/components/ui/switch/Switch.vue'
import TemplateSuggestion from '@/components/ui/template-suggestion/TemplateSuggestion.vue'
import JsonSchemaBuilder from '@/components/ui/json-schema-builder/JsonSchemaBuilder.vue'
import { promptsApi } from '@/services/api-client'
import type { PromptResponse, CreatePromptRequest } from '@/services/definitions/prompt'
import type { JsonSchema } from '@/components/ui/json-schema-builder/types'
import { useUI } from '@/services/ui'

interface Props {
    open: boolean
    editingPrompt?: PromptResponse | null
    cloningPrompt?: PromptResponse | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
    (e: 'error', error: string): void
}

const props = withDefaults(defineProps<Props>(), {
    editingPrompt: null,
    cloningPrompt: null
})

const emit = defineEmits<Emits>()

const { toast, confirm } = useUI()

// Computed for v-model:open
const isOpen = computed({
    get: () => props.open,
    set: (value: boolean) => {
        if (!value) {
            handleCloseDialog()
        } else {
            emit('update:open', value)
        }
    }
})

// State
const saving = ref(false)

const defaultOptions: CreatePromptRequest['options'] = { acceptFileUpload: false }

// Form data
const formData = reactive<CreatePromptRequest>({
    name: '',
    prompt: '',
    json_schema_response: {},
    json_schema_input: {},
    options: { ...defaultOptions }
})

// Schema objects for JsonSchemaBuilder
const inputSchema = ref<JsonSchema>({ type: 'object', properties: {}, required: [] })
const outputSchema = ref<JsonSchema>({ type: 'object', properties: {}, required: [] })

// Original data for comparison
const originalData = ref<{
    name: string
    prompt: string
    inputSchema: string
    outputSchema: string
    acceptFileUpload: boolean
}>({
    name: '',
    prompt: '',
    inputSchema: '',
    outputSchema: '',
    acceptFileUpload: false
})

// Methods
const resetForm = () => {
    formData.name = ''
    formData.prompt = ''
    formData.json_schema_response = {}
    formData.json_schema_input = {}
    formData.options = { ...defaultOptions }
    inputSchema.value = { type: 'object', properties: {}, required: [] }
    outputSchema.value = { type: 'object', properties: {}, required: [] }
}

const populateForm = (prompt: PromptResponse, isClone = false) => {
    formData.name = isClone ? `Copy: ${prompt.name}` : prompt.name
    formData.prompt = prompt.prompt
    formData.json_schema_response = prompt.json_schema_response
    formData.json_schema_input = prompt.json_schema_input
    formData.options = prompt.options || { ...defaultOptions }

    // Convert existing schemas to JsonSchema format for the builder
    if (prompt.json_schema_input && Object.keys(prompt.json_schema_input).length > 0) {
        inputSchema.value = prompt.json_schema_input as unknown as JsonSchema
    } else {
        inputSchema.value = { type: 'object', properties: {}, required: [] }
    }

    if (prompt.json_schema_response && Object.keys(prompt.json_schema_response).length > 0) {
        outputSchema.value = prompt.json_schema_response as unknown as JsonSchema
    } else {
        outputSchema.value = { type: 'object', properties: {}, required: [] }
    }
}

const storeOriginalData = () => {
    originalData.value = {
        name: formData.name,
        prompt: formData.prompt,
        inputSchema: JSON.stringify(inputSchema.value),
        outputSchema: JSON.stringify(outputSchema.value),
        acceptFileUpload: formData.options?.acceptFileUpload || false
    }
}

const hasUnsavedChanges = (): boolean => {
    return (
        originalData.value.name !== formData.name ||
        originalData.value.prompt !== formData.prompt ||
        originalData.value.inputSchema !== JSON.stringify(inputSchema.value) ||
        originalData.value.outputSchema !== JSON.stringify(outputSchema.value) ||
        originalData.value.acceptFileUpload !== (formData.options?.acceptFileUpload || false)
    )
}

const handleCloseDialog = async () => {
    if (hasUnsavedChanges()) {
        const confirmed = await confirm({
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Are you sure you want to close without saving?',
            confirmText: 'Close without saving',
            variant: 'destructive'
        })

        if (!confirmed) return
    }

    emit('update:open', false)
}

const closeDialog = () => {
    handleCloseDialog()
}

const savePrompt = async () => {
    saving.value = true

    try {
        const promptData: CreatePromptRequest = {
            name: formData.name,
            prompt: formData.prompt,
            options: formData.options,
            json_schema_input: inputSchema.value,
            json_schema_response: outputSchema.value
        }

        if (props.editingPrompt) {
            await promptsApi.update(props.editingPrompt.id, promptData)
        } else {
            await promptsApi.create(promptData)
        }

        toast({
            title: 'Success',
            variant: 'success',
            description: `Prompt ${props.editingPrompt ? 'updated' : 'created'} successfully`
        })

        emit('success')
        // Directly close without confirmation since user saved their changes
        emit('update:open', false)
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save prompt'
        emit('error', errorMessage)
    } finally {
        saving.value = false
    }
}

// Watchers
watch(() => props.open, (newValue) => {
    if (newValue) {
        if (props.editingPrompt) {
            populateForm(props.editingPrompt)
        } else if (props.cloningPrompt) {
            populateForm(props.cloningPrompt, true)
        } else {
            resetForm()
        }
        // Store the original data after form is populated for comparison
        storeOriginalData()
    }
})

// Keep formData in sync with schema objects
watch(inputSchema, (newValue) => {
    formData.json_schema_input = newValue
}, { deep: true })

watch(outputSchema, (newValue) => {
    formData.json_schema_response = newValue
}, { deep: true })
</script>

<style scoped>
a {
    text-decoration: underline;
}
</style>
