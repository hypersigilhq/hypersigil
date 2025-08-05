<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>{{ isEditing ? 'Edit' : 'Add' }} Webhook Destination</DialogTitle>
                <DialogDescription>
                    {{ isEditing ? 'Update the webhook destination details.' : `Add a new webhook destination for
                    receiving execution notifications.` }}
                </DialogDescription>
            </DialogHeader>
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="space-y-2">
                    <Label for="name">Name</Label>
                    <Input id="name" v-model="form.name" placeholder="e.g., Production Notifications"
                        :class="{ 'border-destructive': errors.name }" required />
                    <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
                </div>

                <div class="space-y-2">
                    <Label for="url">Webhook URL</Label>
                    <div class="flex space-x-2">
                        <Input id="url" v-model="form.url" type="url"
                            placeholder="https://your-webhook-endpoint.com/webhook"
                            :class="{ 'border-destructive': errors.url }" required />
                        <Button type="button" variant="outline" size="sm" @click="testWebhook"
                            :disabled="!form.url.trim() || testLoading" class="shrink-0">
                            <TestTube v-if="!testLoading" class="h-4 w-4" />
                            <Loader2 v-else class="h-4 w-4 animate-spin" />
                        </Button>
                    </div>
                    <p v-if="errors.url" class="text-sm text-destructive">{{ errors.url }}</p>
                    <p class="text-xs text-muted-foreground">
                        The URL where webhook notifications will be sent.
                    </p>
                </div>

                <div class="flex items-center space-x-2">
                    <Checkbox id="active" v-model:checked="form.active" />
                    <Label for="active" class="text-sm font-normal">
                        Active (webhook will receive notifications)
                    </Label>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="$emit('update:open', false)">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="loading">
                        <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isEditing ? 'Update' : 'Create' }} Webhook
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loader2, TestTube } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { settingsApi, jobsApi } from '@/services/api-client'
import type { WebhookDestinationSettings } from '@/services/definitions/settings'
import { useUI } from '@/services/ui'

interface Props {
    open: boolean
    webhook?: WebhookDestinationSettings | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'created'): void
    (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { toast } = useUI()

const loading = ref(false)
const testLoading = ref(false)
const form = ref({
    name: '',
    url: '',
    active: true
})

const errors = ref<Record<string, string>>({})

const isEditing = computed(() => !!props.webhook)

// Reset form when dialog opens/closes or webhook changes
watch([() => props.open, () => props.webhook], () => {
    if (props.open) {
        if (props.webhook) {
            // Editing mode
            form.value = {
                name: props.webhook.name,
                url: props.webhook.url,
                active: props.webhook.active
            }
        } else {
            // Creating mode
            form.value = {
                name: '',
                url: '',
                active: true
            }
        }
        errors.value = {}
    }
})

const validateForm = () => {
    errors.value = {}

    if (!form.value.name.trim()) {
        errors.value.name = 'Name is required'
    }

    if (!form.value.url.trim()) {
        errors.value.url = 'URL is required'
    } else {
        try {
            new URL(form.value.url)
        } catch {
            errors.value.url = 'Please enter a valid URL'
        }
    }

    return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
    if (!validateForm()) return

    loading.value = true

    try {
        if (isEditing.value && props.webhook) {
            // Update existing webhook
            await settingsApi.update(props.webhook.id, {
                type: 'webhook-destination',
                data: {
                    name: form.value.name.trim(),
                    url: form.value.url.trim(),
                    active: form.value.active
                }
            })

            toast({
                title: 'Success',
                description: 'Webhook destination updated successfully'
            })

            emit('updated')
        } else {
            // Create new webhook
            await settingsApi.create({
                type: 'webhook-destination',
                data: {
                    name: form.value.name.trim(),
                    url: form.value.url.trim(),
                    active: form.value.active
                }
            })

            toast({
                title: 'Success',
                description: 'Webhook destination created successfully'
            })

            emit('created')
        }

        emit('update:open', false)
    } catch (error: any) {
        console.error('Failed to save webhook destination:', error)

        // Handle validation errors from the server
        if (error?.response?.status === 400) {
            toast({
                title: 'Validation Error',
                description: error.response.data?.message || 'Please check your input and try again',
                variant: 'error'
            })
        } else if (error?.response?.status === 409) {
            toast({
                title: 'Conflict',
                description: 'A webhook destination with this name already exists',
                variant: 'error'
            })
        } else {
            toast({
                title: 'Error',
                description: `Failed to ${isEditing.value ? 'update' : 'create'} webhook destination`,
                variant: 'error'
            })
        }
    } finally {
        loading.value = false
    }
}

const testWebhook = async () => {
    // Validate URL first
    if (!form.value.url.trim()) {
        toast({
            title: 'Error',
            description: 'Please enter a webhook URL first',
            variant: 'error'
        })
        return
    }

    try {
        new URL(form.value.url)
    } catch {
        toast({
            title: 'Error',
            description: 'Please enter a valid URL',
            variant: 'error'
        })
        return
    }

    testLoading.value = true

    try {
        await jobsApi.trigger({
            job: {
                type: 'webhook-delivery',
                data: {
                    url: form.value.url.trim()
                }
            }
        })

        toast({
            title: 'Test Webhook Sent',
            description: 'A test webhook has been queued for delivery. Check your endpoint logs to verify receipt.'
        })
    } catch (error: any) {
        console.error('Failed to test webhook:', error)

        toast({
            title: 'Test Failed',
            description: error?.message || 'Failed to send test webhook',
            variant: 'error'
        })
    } finally {
        testLoading.value = false
    }
}
</script>
