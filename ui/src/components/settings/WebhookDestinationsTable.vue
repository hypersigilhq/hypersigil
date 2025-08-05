<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-medium">Webhook Destinations</h3>
                <p class="text-sm text-muted-foreground">
                    Manage webhook destinations for execution notifications and events.
                </p>
            </div>
            <Button @click="showCreateDialog = true">
                <Plus class="mr-2 h-4 w-4" />
                Add Webhook
            </Button>
        </div>

        <div class="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead class="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="loading">
                        <TableCell colspan="5" class="text-center py-8">
                            Loading webhook destinations...
                        </TableCell>
                    </TableRow>
                    <TableRow v-else-if="webhookDestinations.length === 0">
                        <TableCell colspan="5" class="text-center py-8 text-muted-foreground">
                            No webhook destinations found. Add your first webhook destination to get started.
                        </TableCell>
                    </TableRow>
                    <TableRow v-else v-for="webhook in webhookDestinations" :key="webhook.id">
                        <TableCell class="font-medium">{{ webhook.name }}</TableCell>
                        <TableCell class="font-mono text-sm">{{ webhook.url }}</TableCell>
                        <TableCell>
                            <Badge :variant="webhook.active ? 'default' : 'secondary'">
                                {{ webhook.active ? 'Active' : 'Inactive' }}
                            </Badge>
                        </TableCell>
                        <TableCell>{{ formatDate(webhook.created_at) }}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" class="h-8 w-8 p-0">
                                        <MoreHorizontal class="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem @click="editWebhook(webhook)">
                                        <Edit class="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="toggleWebhookStatus(webhook)"
                                        :class="webhook.active ? 'text-orange-600' : 'text-green-600'">
                                        <Power class="mr-2 h-4 w-4" />
                                        {{ webhook.active ? 'Deactivate' : 'Activate' }}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem @click="deleteWebhook(webhook)" class="text-destructive">
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

        <!-- Create/Edit Webhook Destination Dialog -->
        <CreateWebhookDestinationDialog v-model:open="showCreateDialog" :webhook="editingWebhook"
            @created="handleWebhookCreated" @updated="handleWebhookUpdated" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, MoreHorizontal, Trash, Edit, Power } from 'lucide-vue-next'
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { settingsApi } from '@/services/api-client'
import CreateWebhookDestinationDialog from './CreateWebhookDestinationDialog.vue'
import type { WebhookDestinationSettings } from '@/services/definitions/settings'
import { useUI } from '@/services/ui'

const { toast, confirm } = useUI()

const webhookDestinations = ref<WebhookDestinationSettings[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const editingWebhook = ref<WebhookDestinationSettings | null>(null)

const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const loadWebhookDestinations = async () => {
    try {
        loading.value = true
        const response = await settingsApi.listByType('webhook-destination')
        webhookDestinations.value = response.settings.filter(setting => setting.type === 'webhook-destination') as WebhookDestinationSettings[]
    } catch (error) {
        console.error('Failed to load webhook destinations:', error)
        toast({
            title: 'Error',
            description: 'Failed to load webhook destinations',
            variant: 'warning'
        })
    } finally {
        loading.value = false
    }
}

const editWebhook = (webhook: WebhookDestinationSettings) => {
    editingWebhook.value = webhook
    showCreateDialog.value = true
}

const toggleWebhookStatus = async (webhook: WebhookDestinationSettings) => {
    const action = webhook.active ? 'deactivate' : 'activate'
    const confirmed = await confirm({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Webhook`,
        message: `Are you sure you want to ${action} the webhook "${webhook.name}"?`,
        confirmText: action.charAt(0).toUpperCase() + action.slice(1),
        variant: webhook.active ? 'destructive' : 'default'
    })

    if (!confirmed) return

    try {
        await settingsApi.update(webhook.id, {
            type: 'webhook-destination',
            data: { active: !webhook.active }
        })
        toast({
            title: 'Success',
            description: `Webhook ${action}d successfully`
        })
        await loadWebhookDestinations()
    } catch (error) {
        console.error(`Failed to ${action} webhook:`, error)
        toast({
            title: 'Error',
            description: `Failed to ${action} webhook`,
            variant: 'error'
        })
    }
}

const deleteWebhook = async (webhook: WebhookDestinationSettings) => {
    const confirmed = await confirm({
        title: 'Delete Webhook',
        message: `Are you sure you want to delete the webhook "${webhook.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'destructive'
    })

    if (!confirmed) return

    try {
        await settingsApi.delete(webhook.id)
        toast({
            title: 'Success',
            description: 'Webhook deleted successfully'
        })
        await loadWebhookDestinations()
    } catch (error) {
        console.error('Failed to delete webhook:', error)
        toast({
            title: 'Error',
            description: 'Failed to delete webhook',
            variant: 'error'
        })
    }
}

const handleWebhookCreated = () => {
    editingWebhook.value = null
    loadWebhookDestinations()
}

const handleWebhookUpdated = () => {
    editingWebhook.value = null
    loadWebhookDestinations()
}

onMounted(() => {
    loadWebhookDestinations()
})
</script>
