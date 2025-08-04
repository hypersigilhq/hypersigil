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

            <form @submit.prevent="savePrompt" class="flex flex-col h-full">
                <div class="grid grid-cols-2 gap-6 flex-1">
                    <!-- Left Column -->
                    <div class="flex flex-col">
                        <div>
                            <Label for="name">Name</Label>
                            <Input id="name" v-model="formData.name" placeholder="Enter prompt name" required />
                        </div>

                        <div class="flex-1 flex flex-col mt-2">
                            <Label for="prompt">Prompt</Label>
                            <div class="flex-1 min-h-[300px] resize-none">
                                <TemplateSuggestion id="prompt" v-model="formData.prompt"
                                    :schema="formData.json_schema_input" placeholder="Enter your prompt text" class=""
                                    required />
                            </div>
                        </div>
                    </div>

                    <!-- Right Column -->
                    <div class="flex flex-col">
                        <div class="flex-1 flex flex-col">
                            <div class="flex items-center justify-between">
                                <Label for="acceptFileUpload">Accept file upload</Label>
                                <Switch id="acceptFileUpload" :model-value="formData.options?.acceptFileUpload || false"
                                    @update:model-value="(v: boolean) => {
                                        formData.options!.acceptFileUpload = v;
                                    }" />
                            </div>
                            <p class="text-sm text-muted-foreground mt-1">
                                Enable file upload support for this prompt. When enabled, users can upload files as
                                part of their input.
                            </p>
                        </div>
                        <div class="flex-1 flex flex-col">
                            <Label for="schema">JSON Schema Input</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                Enter a valid JSON schema that defines the expected input structure.
                                Use <a href="https://transform.tools/json-to-json-schema" target="_blank">JSON to
                                    JSON
                                    Schema</a> or
                                <a href="https://bjdash.github.io/JSON-Schema-Builder/" target="_blank">JSON Schema
                                    Builder</a>
                            </p>
                            <Textarea id="schema" v-model="schemaInputText"
                                placeholder='{"type": "object", "properties": {...}}'
                                class="flex-1 min-h-[300px] resize-none font-mono text-sm" />
                        </div>
                        <div class="flex-1 flex flex-col mt-3">
                            <Label for="schema">JSON Schema Response</Label>
                            <p class="text-sm text-muted-foreground mt-1">
                                Enter a valid JSON schema that defines the expected response structure.
                                Use <a href="https://transform.tools/json-to-json-schema" target="_blank">JSON to
                                    JSON
                                    Schema</a> or
                                <a href="https://bjdash.github.io/JSON-Schema-Builder/" target="_blank">JSON Schema
                                    Builder</a>
                            </p>
                            <Textarea id="schema" v-model="schemaOutputText"
                                placeholder='{"type": "object", "properties": {...}}'
                                class="flex-1 min-h-[300px] resize-none font-mono text-sm" />
                        </div>
                    </div>
                </div>

                <DialogFooter class="mt-6">
                    <Button type="button" variant="outline" @click="closeDialog">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="saving">
                        {{ saving ? 'Saving...' : (editingPrompt ? 'Update' : 'Create') }}
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
import Switch from '@/components/ui/switch/Switch.vue'
import TemplateSuggestion from '@/components/ui/template-suggestion/TemplateSuggestion.vue'
import { promptsApi } from '@/services/api-client'
import type { PromptResponse, CreatePromptRequest } from '@/services/definitions/prompt'
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

const schemaOutputText = ref('')
const schemaInputText = ref('')

// Original data for comparison
const originalData = ref<{
    name: string
    prompt: string
    schemaInputText: string
    schemaOutputText: string
    acceptFileUpload: boolean
}>({
    name: '',
    prompt: '',
    schemaInputText: '',
    schemaOutputText: '',
    acceptFileUpload: false
})

// Methods
const resetForm = () => {
    formData.name = ''
    formData.prompt = ''
    formData.json_schema_response = {}
    formData.json_schema_input = {}
    formData.options = { ...defaultOptions }
    schemaOutputText.value = ''
    schemaInputText.value = ''
}

const populateForm = (prompt: PromptResponse, isClone = false) => {
    formData.name = isClone ? `Copy: ${prompt.name}` : prompt.name
    formData.prompt = prompt.prompt
    formData.json_schema_response = prompt.json_schema_response
    formData.json_schema_input = prompt.json_schema_input
    formData.options = prompt.options || { ...defaultOptions }
    schemaOutputText.value = JSON.stringify(prompt.json_schema_response, null, 2)
    schemaInputText.value = JSON.stringify(prompt.json_schema_input, null, 2)
}

const storeOriginalData = () => {
    originalData.value = {
        name: formData.name,
        prompt: formData.prompt,
        schemaInputText: schemaInputText.value,
        schemaOutputText: schemaOutputText.value,
        acceptFileUpload: formData.options?.acceptFileUpload || false
    }
}

const hasUnsavedChanges = (): boolean => {
    return (
        originalData.value.name !== formData.name ||
        originalData.value.prompt !== formData.prompt ||
        originalData.value.schemaInputText !== schemaInputText.value ||
        originalData.value.schemaOutputText !== schemaOutputText.value ||
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
            options: formData.options
        }

        try {
            if (schemaOutputText.value) {
                const parsedSchema: Record<string, any> = JSON.parse(schemaOutputText.value)
                promptData.json_schema_response = parsedSchema
            }
        } catch {
            throw new Error('Invalid JSON schema response format')
        }

        try {
            if (schemaInputText.value) {
                const parsedSchema: Record<string, any> = JSON.parse(schemaInputText.value)
                promptData.json_schema_input = parsedSchema
            }
        } catch {
            throw new Error('Invalid JSON schema input format')
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
</script>

<style scoped>
a {
    text-decoration: underline;
}
</style>
