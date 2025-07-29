<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {{ phase === 'form' ? 'Invite New User' : 'User Invited Successfully' }}
                </DialogTitle>
                <DialogDescription>
                    {{ phase === 'form'
                        ? 'Fill in the details to invite a new user to the platform.'
                        : 'The user has been invited. Share the invitation link below.'
                    }}
                </DialogDescription>
            </DialogHeader>

            <!-- Phase 1: User Creation Form -->
            <form v-if="phase === 'form'" @submit.prevent="inviteUser" class="space-y-4">
                <div>
                    <Label for="email">Email</Label>
                    <Input id="email" v-model="formData.email" type="email" placeholder="Enter user email" required
                        :disabled="creating" />
                </div>

                <div>
                    <Label for="name">Name</Label>
                    <Input id="name" v-model="formData.name" placeholder="Enter user name" required
                        :disabled="creating" />
                </div>

                <div>
                    <Label for="role">Role</Label>
                    <Select v-model="formData.role" :disabled="creating">
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

                <div v-if="error" class="text-sm text-destructive">
                    {{ error }}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" @click="closeDialog" :disabled="creating">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="creating || !isFormValid">
                        {{ creating ? 'Inviting...' : 'Send Invitation' }}
                    </Button>
                </DialogFooter>
            </form>

            <!-- Phase 2: Invitation Link Display -->
            <div v-else-if="phase === 'success'" class="space-y-4">
                <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center space-x-2 text-green-800">
                        <CheckCircle class="h-5 w-5" />
                        <span class="font-medium">Invitation sent successfully!</span>
                    </div>
                    <p class="text-sm text-green-700 mt-1">
                        {{ invitationData?.user.name }} ({{ invitationData?.user.email }}) has been invited as {{
                            invitationData?.user.role }}.
                    </p>
                </div>

                <div>
                    <Label>Invitation Link</Label>
                    <div class="flex items-center space-x-2 mt-1">
                        <Input v-if="invitationLink" :model-value="invitationLink" readonly class="font-mono text-sm" />
                        <CopyToClipboard :text="invitationLink" :show-toast="true" />
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">
                        Share this link with the user to complete their registration.
                    </p>
                </div>

                <DialogFooter>
                    <Button @click="closeDialog">
                        Done
                    </Button>
                </DialogFooter>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { CheckCircle } from 'lucide-vue-next'

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import CopyToClipboard from '@/components/ui/copy-to-clipboard/CopyToClipboard.vue'

import { userApi } from '@/services/api-client'
import type { CreateUserInvitationResponse, UserRole } from '@/services/definitions/user'

interface Props {
    open: boolean
    invitationData?: {
        user: any
        invitation_token: string
    } | null
}

interface Emits {
    (e: 'update:open', value: boolean): void
    (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive state
const creating = ref(false)
const error = ref<string | null>(null)
const phase = ref<'form' | 'success'>('form')
const invitationData = ref<CreateUserInvitationResponse | null>(null)

// Form data
const formData = reactive<{
    email: string
    name: string
    role: UserRole
}>({
    email: '',
    name: '',
    role: 'user'
})

// Computed
const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value)
})

const isFormValid = computed(() => {
    return formData.email.trim() !== '' &&
        formData.name.trim() !== '' &&
        formData.role
})

const invitationLink = computed(() => {
    if (!invitationData.value?.invitation_token) return ''
    return `${window.location.origin}/auth/invitation/${invitationData.value.invitation_token}`
})

// Watch for dialog open/close
watch(() => props.open, (open) => {
    if (open) {
        if (props.invitationData) {
            // If invitation data is provided, show the success phase
            invitationData.value = props.invitationData
            phase.value = 'success'
        } else {
            // Reset form when opening for new invitation
            resetForm()
        }
    }
})

// Reset form
const resetForm = () => {
    formData.email = ''
    formData.name = ''
    formData.role = 'user'
    error.value = null
    phase.value = 'form'
    invitationData.value = null
}

// Invite user
const inviteUser = async () => {
    creating.value = true
    error.value = null

    try {
        const response = await userApi.invite({
            email: formData.email.trim(),
            name: formData.name.trim(),
            role: formData.role
        })

        invitationData.value = response
        phase.value = 'success'
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to invite user'
    } finally {
        creating.value = false
    }
}

// Close dialog
const closeDialog = () => {
    isOpen.value = false
}
</script>
