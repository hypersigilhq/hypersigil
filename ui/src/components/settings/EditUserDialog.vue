<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-md">
            <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                    Update the role and status for {{ user?.name || 'this user' }}.
                </DialogDescription>
            </DialogHeader>

            <form v-if="user" @submit.prevent="updateUser" class="space-y-4">
                <!-- User Info Display -->
                <div class="p-3 bg-muted rounded-lg">
                    <div class="text-sm font-medium">{{ user.name }}</div>
                    <div class="text-sm text-muted-foreground">{{ user.email }}</div>
                </div>

                <!-- Role Selection -->
                <div>
                    <Label for="role">Role</Label>
                    <Select v-model="formData.role" :disabled="updating">
                        <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Status Selection -->
                <div>
                    <Label for="status">Status</Label>
                    <Select v-model="formData.status" :disabled="updating">
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Status Change Warning -->
                <div v-if="showStatusWarning" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div class="flex items-center space-x-2 text-yellow-800">
                        <AlertTriangle class="h-4 w-4" />
                        <span class="text-sm font-medium">Status Change Warning</span>
                    </div>
                    <p class="text-sm text-yellow-700 mt-1">
                        {{ statusWarningMessage }}
                    </p>
                </div>

                <!-- Error Display -->
                <div v-if="error" class="text-sm text-destructive">
                    {{ error }}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="closeDialog" :disabled="updating">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="updating || !hasChanges">
                        {{ updating ? 'Updating...' : 'Update User' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

import { userApi } from '@/services/api-client'
import type { UserSummary, UserRole, UserStatus } from '@/services/definitions/user'

interface Props {
    open: boolean
    user: UserSummary | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const updating = ref(false)
const error = ref<string | null>(null)

// Form data
const formData = reactive<{
    role: UserRole
    status: UserStatus
}>({
    role: 'user',
    status: 'active'
})

// Computed
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

const hasChanges = computed(() => {
    if (!props.user) return false
    return formData.role !== props.user.role || formData.status !== props.user.status
})

const showStatusWarning = computed(() => {
    if (!props.user) return false

    // Show warning when changing from active to inactive
    if (props.user.status === 'active' && formData.status === 'inactive') {
        return true
    }

    // Show warning when changing from inactive to active
    if (props.user.status === 'inactive' && formData.status === 'active') {
        return true
    }

    return false
})

const statusWarningMessage = computed(() => {
    if (!props.user) return ''

    if (props.user.status === 'active' && formData.status === 'inactive') {
        return 'Deactivating this user will prevent them from logging in and accessing the platform.'
    }

    if (props.user.status === 'inactive' && formData.status === 'active') {
        return 'Activating this user will allow them to log in and access the platform again.'
    }

    return ''
})

// Watch for dialog open/close and user changes
watch(() => props.open, (open) => {
    if (open && props.user) {
        resetForm()
    }
})

watch(() => props.user, (user) => {
    if (user && props.open) {
        resetForm()
    }
})

// Reset form with user data
const resetForm = () => {
    if (props.user) {
        formData.role = props.user.role
        formData.status = props.user.status
    }
    error.value = null
}

// Update user
const updateUser = async () => {
    if (!props.user) return

    updating.value = true
    error.value = null

    try {
        await userApi.update({
            params: { id: props.user.id },
            body: {
                role: formData.role,
                status: formData.status
            }
        })

        emit('success')
        closeDialog()
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to update user'
    } finally {
        updating.value = false
    }
}

// Close dialog
const closeDialog = () => {
    isOpen.value = false
}
</script>
