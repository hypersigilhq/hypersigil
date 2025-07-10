<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-2xl">
            <DialogHeader>
                <DialogTitle>
                    {{ editingItem ? 'Edit Test Data Item' : 'Create New Test Data Item' }}
                </DialogTitle>
                <DialogDescription>
                    {{ editingItem ? 'Update the item details below.' : `Fill in the details to create a new test data
                    item.`}}
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="saveItem" class="space-y-4">
                <div>
                    <Label for="name">Name (Optional)</Label>
                    <Input id="name" v-model="formData.name" placeholder="Enter item name" />
                </div>

                <div>
                    <Label for="content">Content</Label>
                    <Textarea id="content" v-model="formData.content" placeholder="Enter test data content" rows="8"
                        required />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="closeDialog">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="saving">
                        {{ saving ? 'Saving...' : (editingItem ? 'Update' : 'Create') }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
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

import { testDataApi } from '@/services/api-client'
import type { TestDataItemResponse, CreateTestDataItemRequest } from '../../services/definitions/test-data'

interface Props {
    open: boolean
    groupId: string
    editingItem?: TestDataItemResponse | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
    editingItem: null
})

const emit = defineEmits<Emits>()

// Reactive state
const saving = ref(false)
const error = ref<string | null>(null)

// Form data
const formData = reactive<CreateTestDataItemRequest>({
    name: '',
    content: ''
})

// Computed
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

// Watch for editing item changes
watch(() => props.editingItem, (item) => {
    if (item) {
        formData.name = item.name || ''
        formData.content = item.content
    } else {
        formData.name = ''
        formData.content = ''
    }
    error.value = null
}, { immediate: true })

// Watch for dialog open/close
watch(() => props.open, (open) => {
    if (!open) {
        error.value = null
    }
})

// Save item
const saveItem = async () => {
    saving.value = true
    error.value = null

    try {
        const itemData = {
            name: formData.name || undefined,
            content: formData.content
        }

        if (props.editingItem) {
            await testDataApi.items.update(props.editingItem.id, itemData)
        } else {
            await testDataApi.groups.createItem(props.groupId, itemData)
        }

        emit('success')
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save item'
    } finally {
        saving.value = false
    }
}

// Close dialog
const closeDialog = () => {
    isOpen.value = false
}
</script>
