<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {{ editingGroup ? 'Edit Test Data Group' : 'Create New Test Data Group' }}
                </DialogTitle>
                <DialogDescription>
                    {{ editingGroup ? 'Update the group details below.' : `Fill in the details to create a new test data
                    group.` }}
                </DialogDescription>
            </DialogHeader>

            <form @submit.prevent="saveGroup" class="space-y-4">
                <div>
                    <Label for="name">Name</Label>
                    <Input id="name" v-model="formData.name" placeholder="Enter group name" required />
                </div>
                <div v-if="!editingGroup">
                    <Label for="name">JSON Mode</Label>
                    <Switch id="user-input-switch" class="ml-3" :model-value="formData.mode === 'json'"
                        @update:model-value="(value: boolean) => formData.mode = value ? 'json' : 'raw'" />
                </div>

                <div>
                    <Label for="description">Description (Optional)</Label>
                    <Textarea id="description" v-model="formData.description" placeholder="Enter group description"
                        rows="3" />
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="closeDialog">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="saving">
                        {{ saving ? 'Saving...' : (editingGroup ? 'Update' : 'Create') }}
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
import type { TestDataGroupResponse, CreateTestDataGroupRequest } from '../../services/definitions/test-data'
import Switch from '../ui/switch/Switch.vue'

interface Props {
    open: boolean
    editingGroup?: TestDataGroupResponse | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
    editingGroup: null
})

const emit = defineEmits<Emits>()

// Reactive state
const saving = ref(false)
const error = ref<string | null>(null)

// Form data
const formData = reactive<CreateTestDataGroupRequest>({
    name: '',
    description: '',
    mode: 'json'
})

// Computed
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

// Watch for editing group changes
watch(() => props.editingGroup, (group) => {
    if (group) {
        formData.name = group.name
        formData.description = group.description || ''
        formData.mode = group.mode
    } else {
        formData.name = ''
        formData.description = ''
        formData.mode = 'json'
    }
    error.value = null
}, { immediate: true })

// Watch for dialog open/close
watch(() => props.open, (open) => {
    if (!open) {
        error.value = null
    }
})

// Save group
const saveGroup = async () => {
    saving.value = true
    error.value = null

    try {
        const groupData = {
            name: formData.name,
            description: formData.description || undefined,
            mode: formData.mode
        }

        if (props.editingGroup) {
            await testDataApi.groups.update(props.editingGroup.id, groupData)
        } else {
            await testDataApi.groups.create(groupData)
        }

        emit('success')
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to save group'
    } finally {
        saving.value = false
    }
}

// Close dialog
const closeDialog = () => {
    isOpen.value = false
}
</script>
