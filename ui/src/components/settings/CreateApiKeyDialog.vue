<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                    Create a new API key for programmatic access to your account.
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="space-y-2">
                    <Label for="name">Name</Label>
                    <Input id="name" v-model="form.name" placeholder="Enter API key name" required />
                </div>

                <div class="space-y-2">
                    <Label>Scopes</Label>
                    <div class="space-y-2">
                        <div class="flex items-center space-x-2">
                            <Checkbox id="executions-run" v-model:checked="form.scopes.executionsRun" />
                            <Label for="executions-run" class="text-sm font-normal">
                                executions:run - Execute prompts and manage executions
                            </Label>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="$emit('update:open', false)">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="loading">
                        {{ loading ? 'Creating...' : 'Create API Key' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <!-- Success Dialog -->
    <Dialog :open="showSuccessDialog" @update:open="showSuccessDialog = $event">
        <DialogContent class="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>API Key Created Successfully</DialogTitle>
                <DialogDescription>
                    <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p class="text-sm text-green-700 mt-1">
                            Your API key has been created. <strong>Copy it now as it won't be shown again.</strong>
                        </p>
                    </div>
                </DialogDescription>
            </DialogHeader>

            <div class="space-y-4">
                <div class="space-y-2">
                    <Label>API Key</Label>
                    <div class="flex items-center space-x-2">
                        <Input :model-value="createdApiKey" readonly class="font-mono text-sm" />
                        <Button type="button" variant="outline" size="sm" @click="copyToClipboard">
                            {{ copied ? 'Copied!' : 'Copy' }}
                        </Button>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button @click="closeSuccessDialog">
                    Done
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
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
import { apiKeysApi } from '@/services/api-client'
import { useUI } from '@/services/ui'
import type { CreateApiKeyRequest } from '@/services/definitions/api-key'

const { toast } = useUI()

interface Props {
    open: boolean
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'created'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const showSuccessDialog = ref(false)
const createdApiKey = ref('')
const copied = ref(false)

const form = reactive({
    name: '',
    scopes: {
        executionsRun: true
    }
})

const handleSubmit = async () => {
    try {
        loading.value = true

        const scopes: CreateApiKeyRequest['scopes'] = []
        if (form.scopes.executionsRun) {
            scopes.push('executions:run')
        }

        const response = await apiKeysApi.create({
            name: form.name,
            scopes
        })

        createdApiKey.value = response.plain_key
        showSuccessDialog.value = true
        emit('update:open', false)
        emit('created')

        // Reset form
        form.name = ''
        form.scopes.executionsRun = true

    } catch (error) {
        console.error('Failed to create API key:', error)
        toast({
            title: 'Error',
            description: 'Failed to create API key',
            variant: 'warning'
        })
    } finally {
        loading.value = false
    }
}

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(createdApiKey.value)
        copied.value = true
        setTimeout(() => {
            copied.value = false
        }, 2000)
    } catch (error) {
        console.error('Failed to copy to clipboard:', error)
    }
}

const closeSuccessDialog = () => {
    showSuccessDialog.value = false
    createdApiKey.value = ''
    copied.value = false
}
</script>
