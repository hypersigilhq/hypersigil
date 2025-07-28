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
                        <TableHead>Versions</TableHead>
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
                        <TableCell>{{ prompt.current_version }}</TableCell>
                        <TableCell>{{ formatDate(prompt.created_at) }}</TableCell>
                        <TableCell>{{ formatDate(prompt.updated_at) }}</TableCell>
                        <TableCell class="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" class="h-8 w-8 p-0">
                                        <MoreHorizontal class="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem @click="viewPrompt(prompt)">
                                        <Eye class="w-4 h-4 mr-2" />
                                        View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="scheduleExecution(prompt)">
                                        <Play class="w-4 h-4 mr-2" />
                                        Schedule execution
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="clonePrompt(prompt)">
                                        <Copy class="w-4 h-4 mr-2" />
                                        Clone prompt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="editPrompt(prompt)">
                                        <Edit class="w-4 h-4 mr-2" />
                                        Edit prompt
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="navigateToExecutions(prompt.id)">
                                        <Search class="w-4 h-4 mr-2" />
                                        View executions
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="navigateToExecutionBundles(prompt.id)">
                                        <Package class="w-4 h-4 mr-2" />
                                        View execution bundles
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="deletePrompt(prompt)"
                                        class="text-destructive focus:text-destructive">
                                        <Trash2 class="w-4 h-4 mr-2" />
                                        Delete prompt
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
            <DialogContent class="max-w-4xl w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {{ editingPrompt ? 'Edit Prompt' : (cloningPrompt ? 'Clone Prompt' : 'Create New Prompt') }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ editingPrompt ? 'Update the prompt details below.' : (cloningPrompt ? `Modify the cloned
                        prompt details below.` : 'Fill in the details to create a new prompt.') }}
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
                                <Textarea id="prompt" v-model="formData.prompt" placeholder="Enter your prompt text"
                                    class="flex-1 min-h-[300px] resize-none" required />
                            </div>
                        </div>

                        <!-- Right Column -->
                        <div class="flex flex-col">
                            <div class="flex-1 flex flex-col">
                                <div class="flex items-center justify-between">
                                    <Label for="acceptFileUpload">Accept file upload</Label>
                                    <Switch id="acceptFileUpload"
                                        :model-value="formData.options?.acceptFileUpload || false" @update:model-value="(v: boolean) => {
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

        <ViewPromptDialog :open="showViewDialog" :prompt="viewingPrompt" @close="showViewDialog = false" />

        <!-- Schedule Execution Dialog -->
        <ScheduleExecutionDialog v-model:open="showScheduleDialog" :prompt-id="schedulingPrompt?.id"
            :prompt-name="schedulingPrompt?.name" @success="onExecutionSuccess" />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { debounce } from 'lodash-es'
import { Plus, Eye, Edit, Trash2, Play, Package, Copy, Search, MoreHorizontal } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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

import { promptsApi } from '@/services/api-client'
import type { PromptResponse, CreatePromptRequest } from '../../services/definitions/prompt'
import ScheduleExecutionDialog from '@/components/executions/ScheduleExecutionDialog.vue'
import { useRouter } from 'vue-router'
import ViewPromptDialog from './ViewPromptDialog.vue'
import DropdownMenu from '../ui/dropdown-menu/DropdownMenu.vue'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { useUI } from '@/services/ui'
import Switch from '../ui/switch/Switch.vue'

const router = useRouter()
const { toast, confirm } = useUI()

// Reactive state
const prompts = ref<PromptResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const orderBy = ref<'name' | 'created_at' | 'updated_at'>('created_at')
const orderDirection = ref<'ASC' | 'DESC'>('DESC')
const currentPage = ref(1)
const pageLimit = ref(25)

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
const cloningPrompt = ref<PromptResponse | null>(null)
const viewingPrompt = ref<PromptResponse | null>(null)
const schedulingPrompt = ref<PromptResponse | null>(null)
const saving = ref(false)

let defaultOptions: CreatePromptRequest['options'] = { acceptFileUpload: false }

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
    cloningPrompt.value = null
    formData.name = ''
    formData.prompt = ''
    formData.json_schema_response = {}
    formData.json_schema_input = {}
    formData.options = { ...defaultOptions }
    schemaOutputText.value = ''
    schemaInputText.value = ''
    showDialog.value = true
}

const editPrompt = (prompt: PromptResponse) => {
    editingPrompt.value = prompt
    cloningPrompt.value = null
    formData.name = prompt.name
    formData.prompt = prompt.prompt
    formData.json_schema_response = prompt.json_schema_response
    formData.json_schema_input = prompt.json_schema_input
    formData.options = prompt.options || { ...defaultOptions }
    schemaOutputText.value = JSON.stringify(prompt.json_schema_response, null, 2)
    schemaInputText.value = JSON.stringify(prompt.json_schema_input, null, 2)
    showDialog.value = true
}

const clonePrompt = (prompt: PromptResponse) => {
    editingPrompt.value = null
    cloningPrompt.value = prompt
    formData.name = `Copy: ${prompt.name}`
    formData.prompt = prompt.prompt
    formData.json_schema_response = prompt.json_schema_response
    formData.json_schema_input = prompt.json_schema_input
    formData.options = prompt.options || { ...defaultOptions }
    schemaOutputText.value = JSON.stringify(prompt.json_schema_response, null, 2)
    schemaInputText.value = JSON.stringify(prompt.json_schema_input, null, 2)
    showDialog.value = true
}

const viewPrompt = (prompt: PromptResponse) => {
    viewingPrompt.value = prompt
    showViewDialog.value = true
}

const closeDialog = () => {
    showDialog.value = false
    editingPrompt.value = null
    cloningPrompt.value = null
}

// Save prompt
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
                let parsedSchema: Record<string, any>
                parsedSchema = JSON.parse(schemaOutputText.value)
                promptData.json_schema_response = parsedSchema
            }
        } catch {
            throw new Error('Invalid JSON schema response format')
        }
        try {
            if (schemaInputText.value) {
                let parsedSchema: Record<string, any>
                parsedSchema = JSON.parse(schemaInputText.value)
                promptData.json_schema_input = parsedSchema
            }
        } catch {
            throw new Error('Invalid JSON schema input format')
        }

        if (editingPrompt.value) {
            await promptsApi.update(editingPrompt.value.id, promptData)
        } else {
            await promptsApi.create(promptData)
        }

        toast({
            title: 'Success',
            variant: 'success',
            description: `Prompt ${editingPrompt.value ? `updated` : `created`} successfully`
        })
        closeDialog()
        loadPrompts()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save prompt'
    } finally {
        saving.value = false
    }
}

// Schedule execution
const scheduleExecution = (prompt: PromptResponse) => {
    schedulingPrompt.value = prompt
    showScheduleDialog.value = true
}

// Handle execution success from dialog
const onExecutionSuccess = (executionId: string) => {
    console.log('Execution created successfully:', executionId)
    showScheduleDialog.value = false
    schedulingPrompt.value = null
}

// Delete prompt
const deletePrompt = async (prompt: PromptResponse) => {
    const confirmed = await confirm({
        title: 'Delete Prompt',
        message: `Are you sure you want to delete "${prompt.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'destructive'
    })

    if (!confirmed) return

    try {
        await promptsApi.delete(prompt.id)
        toast({
            title: 'Success',
            variant: 'success',
            description: 'Prompt deleted successfully'
        })
        loadPrompts()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to delete prompt'
        toast({
            title: 'Error',
            description: error.value,
            variant: 'error'
        })
    }
}

// Navigation functions
const navigateToExecutions = (promptId: string) => {
    router.push(`/executions?prompt_id=${promptId}`)
}

const navigateToExecutionBundles = (promptId: string) => {
    router.push(`/execution-bundles?prompt_id=${promptId}`)
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
<style scoped>
a {
    text-decoration: underline;
}
</style>
