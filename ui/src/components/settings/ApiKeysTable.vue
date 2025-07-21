<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-medium">API Keys</h3>
                <p class="text-sm text-muted-foreground">
                    Manage your API keys for programmatic access.
                </p>
            </div>
            <Button @click="showCreateDialog = true">
                <Plus class="mr-2 h-4 w-4" />
                Create API Key
            </Button>
        </div>

        <div class="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Scopes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead class="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="loading">
                        <TableCell colspan="8" class="text-center py-8">
                            Loading API keys...
                        </TableCell>
                    </TableRow>
                    <TableRow v-else-if="apiKeys.length === 0">
                        <TableCell colspan="8" class="text-center py-8 text-muted-foreground">
                            No API keys found. Create your first API key to get started.
                        </TableCell>
                    </TableRow>
                    <TableRow v-else v-for="apiKey in apiKeys" :key="apiKey.id">
                        <TableCell class="font-medium">{{ apiKey.name }}</TableCell>
                        <TableCell>
                            <code class="text-sm bg-muted px-2 py-1 rounded">{{ apiKey.key_prefix }}...</code>
                        </TableCell>
                        <TableCell>
                            <div class="flex flex-wrap gap-1">
                                <Badge v-for="scope in apiKey.permissions.scopes" :key="scope" variant="secondary">
                                    {{ scope }}
                                </Badge>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge :variant="apiKey.status === 'active' ? 'default' : 'destructive'">
                                {{ apiKey.status }}
                            </Badge>
                        </TableCell>
                        <TableCell>{{ apiKey.usage_stats.total_requests }} requests</TableCell>
                        <TableCell>
                            {{ apiKey.usage_stats.last_used_at
                                ? formatDate(apiKey.usage_stats.last_used_at)
                                : 'Never' }}
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
                                    <DropdownMenuItem @click="editApiKey(apiKey)">
                                        <Edit class="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="revokeApiKey(apiKey)"
                                        :disabled="apiKey.status === 'revoked'" class="text-destructive">
                                        <Trash class="mr-2 h-4 w-4" />
                                        Revoke
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <!-- Create API Key Dialog -->
        <CreateApiKeyDialog v-model:open="showCreateDialog" @created="handleApiKeyCreated" />

        <!-- Edit API Key Dialog -->
        <EditApiKeyDialog v-model:open="showEditDialog" :api-key="selectedApiKey" @updated="handleApiKeyUpdated" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, MoreHorizontal, Edit, Trash } from 'lucide-vue-next'
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
import { apiKeysApi } from '@/services/api-client'
import CreateApiKeyDialog from './CreateApiKeyDialog.vue'
import EditApiKeyDialog from './EditApiKeyDialog.vue'
import type { PublicApiKey } from '@/services/definitions/api-key'
import { useUI } from '@/services/ui'

const { toast, confirm } = useUI()

const apiKeys = ref<PublicApiKey[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedApiKey = ref<PublicApiKey | null>(null)

const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const loadApiKeys = async () => {
    try {
        loading.value = true
        const response = await apiKeysApi.list()
        apiKeys.value = response.api_keys
    } catch (error) {
        console.error('Failed to load API keys:', error)
        toast({
            title: 'Error',
            description: 'Failed to load API keys',
            variant: 'warning'
        })
    } finally {
        loading.value = false
    }
}

const editApiKey = (apiKey: PublicApiKey) => {
    selectedApiKey.value = apiKey
    showEditDialog.value = true
}

const revokeApiKey = async (apiKey: PublicApiKey) => {
    const confirmed = await confirm({
        title: 'Revoke API Key',
        message: `Are you sure you want to revoke the API key "${apiKey.name}"? This action cannot be undone.`,
        confirmText: 'Revoke',
        variant: 'destructive'
    })

    if (!confirmed) return

    try {
        await apiKeysApi.revoke({ id: apiKey.id })
        toast({
            title: 'Success',
            description: 'API key revoked successfully'
        })
        await loadApiKeys()
    } catch (error) {
        console.error('Failed to revoke API key:', error)
        toast({
            title: 'Error',
            description: 'Failed to revoke API key',
            variant: 'error'
        })
    }
}

const handleApiKeyCreated = () => {
    loadApiKeys()
}

const handleApiKeyUpdated = () => {
    loadApiKeys()
}

onMounted(() => {
    loadApiKeys()
})
</script>
