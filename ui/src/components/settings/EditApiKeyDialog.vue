<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Edit API Key</DialogTitle>
                <DialogDescription>
                    Update the name of your API key.
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="handleSubmit" class="space-y-4" v-if="apiKey">
                <div class="space-y-2">
                    <Label for="name">Name</Label>
                    <Input id="name" v-model="form.name" placeholder="Enter API key name" required />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="$emit('update:open', false)">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="loading">
                        {{ loading ? 'Updating...' : 'Update API Key' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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
import { apiKeysApi } from '@/services/api-client'
import type { PublicApiKey } from '@/services/definitions/api-key'

interface Props {
    open: boolean
    apiKey: PublicApiKey | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const form = ref({
    name: ''
})

// Watch for apiKey changes to populate form
watch(() => props.apiKey, (newApiKey) => {
    if (newApiKey) {
        form.value.name = newApiKey.name
    }
}, { immediate: true })

const handleSubmit = async () => {
    if (!props.apiKey) return

    try {
        loading.value = true

        await apiKeysApi.update(props.apiKey.id, {
            name: form.value.name
        })

        emit('update:open', false)
        emit('updated')

    } catch (error) {
        console.error('Failed to update API key:', error)
        // Note: Toast functionality would be added here when available
    } finally {
        loading.value = false
    }
}
</script>
