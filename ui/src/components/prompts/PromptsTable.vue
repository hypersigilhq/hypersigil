<template>
    <div class="space-y-4">
        <!-- Header with search and create button -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search prompts..." class="w-64" @input="debouncedSearch" />
                <Select v-model="orderBy">
                    <SelectTrigger class="w-40">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="updated_at">Updated Date</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                </Select>
                <Select v-model="orderDirection">
                    <SelectTrigger class="w-32">
                        <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DESC">Desc</SelectItem>
                        <SelectItem value="ASC">Asc</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button @click="openCreateDialog">
                <Plus class="w-4 h-4 mr-2" />
                Create Prompt
            </Button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadPrompts" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Prompt Preview</TableHead>
                        <TableHead>Schema</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="prompts.length === 0">
                        <TableCell colspan="6" class="text-center py-8 text-muted-foreground">
                            No prompts found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="prompt in prompts" :key="prompt.id">
                        <TableCell class="font-medium">{{ prompt.name }}</TableCell>
                        <TableCell class="max-w-xs">
                            <div class="truncate" :title="prompt.prompt">
                                {{ prompt.prompt }}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary">
                                {{ Object.keys(prompt.json_schema_response).length }} fields
                            </Badge>
                        </TableCell>
                        <TableCell>{{ formatDate(prompt.created_at) }}</TableCell>
                        <TableCell>{{ formatDate(prompt.updated_at) }}</TableCell>
                        <TableCell class="text-right">
                            <div class="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" @click="viewPrompt(prompt)">
                                    <Eye class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="scheduleExecution(prompt)">
                                    <Play class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="editPrompt(prompt)">
                                    <Edit class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="deletePrompt(prompt)"
                                    class="text-destructive hover:text-destructive">
                                    <Trash2 class="w-4 h-4" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination && pagination.totalPages > 1" class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
                Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to
                {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
                {{ pagination.total }} results
            </div>
            <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" :disabled="!pagination.hasPrev"
                    @click="goToPage(pagination.page - 1)">
                    Previous
                </Button>
                <span class="text-sm">
                    Page {{ pagination.page }} of {{ pagination.totalPages }}
                </span>
                <Button variant="outline" size="sm" :disabled="!pagination.hasNext"
                    @click="goToPage(pagination.page + 1)">
                    Next
                </Button>
            </div>
        </div>

        <!-- Create/Edit Dialog -->
        <Dialog v-model:open="showDialog">
            <DialogContent class="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {{ editingPrompt ? 'Edit Prompt' : 'Create New Prompt' }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ editingPrompt ? 'Update the prompt details below.' : `Fill in the details to create a new
                        prompt.` }}
                    </DialogDescription>
                </DialogHeader>

                <form @submit.prevent="savePrompt" class="space-y-4">
                    <div>
                        <Label for="name">Name</Label>
                        <Input id="name" v-model="formData.name" placeholder="Enter prompt name" required />
                    </div>

                    <div>
                        <Label for="prompt">Prompt</Label>
                        <Textarea id="prompt" v-model="formData.prompt" placeholder="Enter your prompt text" rows="6"
                            required />
                    </div>

                    <div>
                        <Label for="schema">JSON Schema Response</Label>
                        <Textarea id="schema" v-model="schemaText" placeholder='{"type": "object", "properties": {...}}'
                            rows="8" required />
                        <p class="text-sm text-muted-foreground mt-1">
                            Enter a valid JSON schema that defines the expected response structure.
                        </p>
                    </div>

                    <DialogFooter>
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

        <!-- View Dialog -->
        <Dialog v-model:open="showViewDialog">
            <DialogContent class="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{{ viewingPrompt?.name }}</DialogTitle>
                    <DialogDescription>
                        Created: {{ viewingPrompt ? formatDate(viewingPrompt.created_at) : '' }} |
                        Updated: {{ viewingPrompt ? formatDate(viewingPrompt.updated_at) : '' }}
                    </DialogDescription>
                </DialogHeader>

                <div v-if="viewingPrompt" class="space-y-4">
                    <div>
                        <Label>Prompt</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md">
                            <pre class="whitespace-pre-wrap text-sm">{{ viewingPrompt.prompt }}</pre>
                        </div>
                    </div>

                    <div>
                        <Label>JSON Schema Response</Label>
                        <div class="mt-1 p-3 bg-muted rounded-md">
                            <pre class="text-sm">{{ JSON.stringify(viewingPrompt.json_schema_response, null, 2) }}</pre>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button @click="showViewDialog = false">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Schedule Execution Dialog -->
        <Dialog v-model:open="showScheduleDialog">
            <DialogContent class="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Schedule Execution</DialogTitle>
                    <DialogDescription>
                        Schedule execution for prompt: {{ schedulingPrompt?.name }}
                    </DialogDescription>
                </DialogHeader>

                <div v-if="successMessage" class="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
                    <p class="text-sm text-green-800">{{ successMessage }}</p>
                </div>

                <form @submit.prevent="submitScheduleExecution" class="space-y-4">
                    <div>
                        <Label for="userInput">User Input</Label>
                        <Textarea id="userInput" v-model="scheduleFormData.userInput"
                            placeholder="Enter the input text to process with this prompt" rows="4" required />
                    </div>

                    <div>
                        <Label for="providerModel">Provider/Model</Label>
                        <Select v-model="scheduleFormData.providerModel" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select provider and model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-if="loadingProviders" value="loading" disabled>
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
                                    v-model.number="scheduleFormData.options.temperature" placeholder="0.01" />
                            </div>
                            <div>
                                <Label for="maxTokens" class="text-sm">Max Tokens</Label>
                                <Input id="maxTokens" type="number" min="1"
                                    v-model.number="scheduleFormData.options.maxTokens" placeholder="Auto" />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <Label for="topP" class="text-sm">Top P</Label>
                                <Input id="topP" type="number" step="0.01" min="0" max="1"
                                    v-model.number="scheduleFormData.options.topP" placeholder="Auto" />
                            </div>
                            <div>
                                <Label for="topK" class="text-sm">Top K</Label>
                                <Input id="topK" type="number" min="1" v-model.number="scheduleFormData.options.topK"
                                    placeholder="Auto" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" @click="closeScheduleDialog">
                            Cancel
                        </Button>
                        <Button type="submit" :disabled="scheduling || loadingProviders">
                            {{ scheduling ? 'Scheduling...' : 'Schedule Execution' }}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { debounce } from 'lodash-es'
import { Plus, Eye, Edit, Trash2, Play } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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

import { promptsApi, executionsApi } from '@/services/api-client'
import type { PromptResponse, CreatePromptRequest, UpdatePromptRequest } from '@/services/prompt-definitions'

// Reactive state
const prompts = ref<PromptResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const orderBy = ref<'name' | 'created_at' | 'updated_at'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(10)

const pagination = ref<{
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
} | null>(null)

// Dialog state
const showDialog = ref(false)
const showViewDialog = ref(false)
const showScheduleDialog = ref(false)
const editingPrompt = ref<PromptResponse | null>(null)
const viewingPrompt = ref<PromptResponse | null>(null)
const schedulingPrompt = ref<PromptResponse | null>(null)
const saving = ref(false)
const scheduling = ref(false)
const loadingProviders = ref(false)
const availableModels = ref<Record<string, string[]>>({})
const successMessage = ref<string | null>(null)

// Form data
const formData = reactive<CreatePromptRequest>({
    name: '',
    prompt: '',
    json_schema_response: {}
})

const scheduleFormData = reactive({
    userInput: '',
    providerModel: '',
    options: {
        temperature: 0.01,
        maxTokens: undefined as number | undefined,
        topP: undefined as number | undefined,
        topK: undefined as number | undefined
    }
})

const schemaText = ref('')

// Computed properties
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

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadPrompts()
}, 300)

// Load prompts
const loadPrompts = async () => {
    loading.value = true
    error.value = null

    try {
        const response = await promptsApi.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                search: searchQuery.value || undefined,
                orderBy: orderBy.value,
                orderDirection: orderDirection.value
            }
        })

        prompts.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load prompts'
    } finally {
        loading.value = false
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadPrompts()
}

// Dialog management
const openCreateDialog = () => {
    editingPrompt.value = null
    formData.name = ''
    formData.prompt = ''
    formData.json_schema_response = {}
    schemaText.value = ''
    showDialog.value = true
}

const editPrompt = (prompt: PromptResponse) => {
    editingPrompt.value = prompt
    formData.name = prompt.name
    formData.prompt = prompt.prompt
    formData.json_schema_response = prompt.json_schema_response
    schemaText.value = JSON.stringify(prompt.json_schema_response, null, 2)
    showDialog.value = true
}

const viewPrompt = (prompt: PromptResponse) => {
    viewingPrompt.value = prompt
    showViewDialog.value = true
}

const closeDialog = () => {
    showDialog.value = false
    editingPrompt.value = null
}

// Save prompt
const savePrompt = async () => {
    saving.value = true

    try {
        // Parse JSON schema
        let parsedSchema: Record<string, any>
        try {
            parsedSchema = JSON.parse(schemaText.value)
        } catch {
            throw new Error('Invalid JSON schema format')
        }

        const promptData = {
            name: formData.name,
            prompt: formData.prompt,
            json_schema_response: parsedSchema
        }

        if (editingPrompt.value) {
            await promptsApi.update(editingPrompt.value.id, promptData)
        } else {
            await promptsApi.create(promptData)
        }

        closeDialog()
        loadPrompts()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save prompt'
    } finally {
        saving.value = false
    }
}

// Schedule execution
const scheduleExecution = async (prompt: PromptResponse) => {
    schedulingPrompt.value = prompt
    scheduleFormData.userInput = ''
    scheduleFormData.providerModel = ''
    scheduleFormData.options.temperature = 0.01
    scheduleFormData.options.maxTokens = undefined
    scheduleFormData.options.topP = undefined
    scheduleFormData.options.topK = undefined
    successMessage.value = null
    showScheduleDialog.value = true
    await loadProviders()
}

const loadProviders = async () => {
    loadingProviders.value = true
    try {
        availableModels.value = await executionsApi.getAvailableModels()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load models'
    } finally {
        loadingProviders.value = false
    }
}

const closeScheduleDialog = () => {
    showScheduleDialog.value = false
    schedulingPrompt.value = null
    successMessage.value = null
}

const submitScheduleExecution = async () => {
    if (!schedulingPrompt.value) return

    scheduling.value = true
    successMessage.value = null

    try {
        const options: Record<string, any> = {}
        if (scheduleFormData.options.temperature !== undefined) {
            options.temperature = scheduleFormData.options.temperature
        }
        if (scheduleFormData.options.maxTokens !== undefined) {
            options.maxTokens = scheduleFormData.options.maxTokens
        }
        if (scheduleFormData.options.topP !== undefined) {
            options.topP = scheduleFormData.options.topP
        }
        if (scheduleFormData.options.topK !== undefined) {
            options.topK = scheduleFormData.options.topK
        }

        const execution = await executionsApi.create({
            promptId: schedulingPrompt.value.id,
            userInput: scheduleFormData.userInput,
            providerModel: scheduleFormData.providerModel,
            options: Object.keys(options).length > 0 ? options : undefined
        })

        successMessage.value = `Execution scheduled successfully! Execution ID: ${execution.id}`
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to schedule execution'
    } finally {
        scheduling.value = false
    }
}

// Delete prompt
const deletePrompt = async (prompt: PromptResponse) => {
    if (!confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
        return
    }

    try {
        await promptsApi.delete(prompt.id)
        loadPrompts()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete prompt'
    }
}

// Utility functions
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Watchers
watch([orderBy, orderDirection], () => {
    currentPage.value = 1
    loadPrompts()
})

// Initialize
onMounted(() => {
    loadPrompts()
})
</script>
