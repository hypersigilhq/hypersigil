<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-medium">Service API Keys</h3>
                <p class="text-sm text-muted-foreground">
                    Manage API keys for service providers like VoyageAI.
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
                        <TableHead>Active</TableHead>
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
                    <TableRow v-else-if="serviceApiKeys.length === 0">
                        <TableCell colspan="4" class="text-center py-8 text-muted-foreground">
                            No service API keys found. Add your first API key to get started.
                        </TableCell>
                    </TableRow>
                    <TableRow v-else v-for="apiKey in serviceApiKeys" :key="apiKey.id">
                        <TableCell class="font-medium">
                            <Badge variant="secondary">{{ apiKey.provider }}</Badge>
                        </TableCell>
                        <TableCell>
                            <Switch :modelValue="apiKey.active"
                                @update:modelValue="toggleApiKeyActive(apiKey, $event)" />
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

        <!-- Create Service API Key Dialog -->
        <CreateServiceApiKeyDialog v-model:open="showCreateDialog" @created="handleApiKeyCreated" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, MoreHorizontal, Trash } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import CreateServiceApiKeyDialog from './CreateServiceApiKeyDialog.vue'
import type { ServiceApiKeySettings } from '@/services/definitions/settings'
import { useUI } from '@/services/ui'

const { toast, confirm } = useUI()

const serviceApiKeys = ref<ServiceApiKeySettings[]>([])
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

const loadServiceApiKeys = async () => {
    try {
        loading.value = true
        const response = await settingsApi.listByType('service-api-key')
        serviceApiKeys.value = response.settings.filter(setting => setting.type === 'service-api-key') as ServiceApiKeySettings[]
    } catch (error) {
        console.error('Failed to load service API keys:', error)
        toast({
            title: 'Error',
            description: 'Failed to load service API keys',
            variant: 'warning'
        })
    } finally {
        loading.value = false
    }
}

const deleteApiKey = async (apiKey: ServiceApiKeySettings) => {
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
        await loadServiceApiKeys()
    } catch (error) {
        console.error('Failed to delete API key:', error)
        toast({
            title: 'Error',
            description: 'Failed to delete API key',
            variant: 'error'
        })
    }
}

const toggleApiKeyActive = async (apiKey: ServiceApiKeySettings, active: boolean) => {
    try {
        await settingsApi.update(apiKey.id, {
            type: 'service-api-key',
            data: { active }
        })
        toast({
            title: 'Success',
            description: `API key ${active ? 'activated' : 'deactivated'} successfully`
        })
        await loadServiceApiKeys()
    } catch (error) {
        console.error('Failed to toggle API key active state:', error)
        toast({
            title: 'Error',
            description: `Failed to ${active ? 'activate' : 'deactivate'} API key`,
            variant: 'error'
        })
    }
}

const handleApiKeyCreated = () => {
    loadServiceApiKeys()
}

onMounted(() => {
    loadServiceApiKeys()
})
</script>
