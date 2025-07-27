<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-medium">LLM API Keys</h3>
                <p class="text-sm text-muted-foreground">
                    Manage API keys for AI providers like OpenAI, Anthropic.
                </p>
            </div>
            <Button @click="showCreateDialog = true">
                <Plus class="mr-2 h-4 w-4" />
                Add API Key
            </Button>
        </div>

        <div class="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead class="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="loading">
                        <TableCell colspan="4" class="text-center py-8">
                            Loading API keys...
                        </TableCell>
                    </TableRow>
                    <TableRow v-else-if="llmApiKeys.length === 0">
                        <TableCell colspan="4" class="text-center py-8 text-muted-foreground">
                            No LLM API keys found. Add your first API key to get started.
                        </TableCell>
                    </TableRow>
                    <TableRow v-else v-for="apiKey in llmApiKeys" :key="apiKey.id">
                        <TableCell class="font-medium">
                            <Badge variant="secondary">{{ apiKey.provider }}</Badge>
                        </TableCell>
                        <TableCell>{{ formatDate(apiKey.created_at) }}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" class="h-8 w-8 p-0">
                                        <MoreHorizontal class="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem @click="deleteApiKey(apiKey)" class="text-destructive">
                                        <Trash class="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <!-- Create LLM API Key Dialog -->
        <CreateLlmApiKeyDialog v-model:open="showCreateDialog" @created="handleApiKeyCreated" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, MoreHorizontal, Trash } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { settingsApi } from '@/services/api-client'
import CreateLlmApiKeyDialog from './CreateLlmApiKeyDialog.vue'
import type { LlmApiKeySettings } from '@/services/definitions/settings'
import { useUI } from '@/services/ui'

const { toast, confirm } = useUI()

const llmApiKeys = ref<LlmApiKeySettings[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)

const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return apiKey
    return apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4)
}

const loadLlmApiKeys = async () => {
    try {
        loading.value = true
        const response = await settingsApi.listByType('llm-api-key')
        llmApiKeys.value = response.settings.filter(setting => setting.type === 'llm-api-key') as LlmApiKeySettings[]
    } catch (error) {
        console.error('Failed to load LLM API keys:', error)
        toast({
            title: 'Error',
            description: 'Failed to load LLM API keys',
            variant: 'warning'
        })
    } finally {
        loading.value = false
    }
}

const deleteApiKey = async (apiKey: LlmApiKeySettings) => {
    const confirmed = await confirm({
        title: 'Delete API Key',
        message: `Are you sure you want to delete the ${apiKey.provider} API key? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'destructive'
    })

    if (!confirmed) return

    try {
        await settingsApi.delete(apiKey.id)
        toast({
            title: 'Success',
            description: 'API key deleted successfully'
        })
        await loadLlmApiKeys()
    } catch (error) {
        console.error('Failed to delete API key:', error)
        toast({
            title: 'Error',
            description: 'Failed to delete API key',
            variant: 'error'
        })
    }
}

const handleApiKeyCreated = () => {
    loadLlmApiKeys()
}

onMounted(() => {
    loadLlmApiKeys()
})
</script>
