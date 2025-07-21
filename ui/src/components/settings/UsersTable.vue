<template>
    <div class="space-y-4">
        <!-- Header with search and filters -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <Input v-model="searchQuery" placeholder="Search users..." class="w-64" @input="debouncedSearch" />
                <Select v-model="roleFilter">
                    <SelectTrigger class="w-32">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem :value="null">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                </Select>
                <Select v-model="statusFilter">
                    <SelectTrigger class="w-32">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem :value="null">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button @click="showCreateDialog = true">
                Invite User
            </Button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8 text-destructive">
            {{ error }}
            <Button @click="loadUsers" variant="outline" class="ml-2">
                Retry
            </Button>
        </div>

        <!-- Table -->
        <div v-else class="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="users.length === 0">
                        <TableCell colspan="6" class="text-center py-8 text-muted-foreground">
                            No users found
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="user in users" :key="user.id">
                        <TableCell class="font-medium">{{ user.name }}</TableCell>
                        <TableCell>{{ user.email }}</TableCell>
                        <TableCell>
                            <Badge :variant="getRoleVariant(user.role)">
                                {{ user.role }}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge :variant="getStatusVariant(user.status)">
                                {{ user.status }}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {{ user.last_login ? new Date(user.last_login).toLocaleString() : 'Never' }}
                        </TableCell>
                        <TableCell>
                            <Button v-if="user.status === 'pending'" variant="outline" size="sm"
                                @click="showInvitationLink(user.id)" :disabled="loadingInvitation">
                                {{ loadingInvitation === user.id ? 'Loading...' : 'Show Link' }}
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <!-- Pagination -->
        <div v-if="pagination && pagination.totalPages > 1" class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
                Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to
                {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of
                {{ pagination.total }} results
            </div>
            <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" :disabled="!pagination.hasPrev"
                    @click="goToPage(pagination.page - 1)">
                    Previous
                </Button>
                <span class="text-sm">
                    Page {{ pagination.page }} of {{ pagination.totalPages }}
                </span>
                <Button variant="outline" size="sm" :disabled="!pagination.hasNext"
                    @click="goToPage(pagination.page + 1)">
                    Next
                </Button>
            </div>
        </div>

        <!-- Create User Dialog -->
        <CreateUserDialog v-model:open="showCreateDialog" @success="handleUserCreated" />

        <!-- Show Invitation Link Dialog -->
        <CreateUserDialog v-model:open="showInvitationDialog" :invitation-data="invitationDialogData"
            @success="handleInvitationDialogClose" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { debounce } from 'lodash-es'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { userApi } from '@/services/api-client'
import type { UserSummary, ListUsersResponse } from '@/services/definitions/user'
import CreateUserDialog from './CreateUserDialog.vue'

// Reactive state
const users = ref<UserSummary[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const roleFilter = ref<'admin' | 'user' | 'viewer' | ''>('')
const statusFilter = ref<'active' | 'inactive' | 'pending' | ''>('')
const currentPage = ref(1)
const pageLimit = ref(10)
const showCreateDialog = ref(false)
const loadingInvitation = ref<string | null>(null)
const showInvitationDialog = ref(false)
const invitationDialogData = ref<any>(null)

const pagination = ref<{
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
} | null>(null)

// Debounced search
const debouncedSearch = debounce(() => {
    currentPage.value = 1
    loadUsers()
}, 300)

// Load users
const loadUsers = async () => {
    loading.value = true
    error.value = null
    try {
        const response = await userApi.list({
            query: {
                page: currentPage.value.toString(),
                limit: pageLimit.value.toString(),
                ...(searchQuery.value.length && { search: searchQuery.value || undefined } || undefined),
                ...(roleFilter.value && { role: roleFilter.value || undefined } || undefined),
                ...(statusFilter.value && { status: statusFilter.value || undefined } || undefined)
            }
        }) as ListUsersResponse

        users.value = response.data
        pagination.value = {
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
            hasNext: response.hasNext,
            hasPrev: response.hasPrev
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load users'
    } finally {
        loading.value = false
    }
}

// Pagination
const goToPage = (page: number) => {
    currentPage.value = page
    loadUsers()
}

// Handle user creation success
const handleUserCreated = () => {
    showCreateDialog.value = false
    loadUsers() // Refresh the users list
}

// Show invitation link for pending user
const showInvitationLink = async (userId: string) => {
    loadingInvitation.value = userId
    try {
        const user = await userApi.getById({ params: { id: userId } })

        if (user.invitation?.token) {
            // Set up the dialog data to show the invitation link
            invitationDialogData.value = {
                user: user,
                invitation_token: user.invitation.token
            }
            showInvitationDialog.value = true
        } else {
            error.value = 'No invitation token found for this user'
        }
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load user invitation'
    } finally {
        loadingInvitation.value = null
    }
}

// Handle invitation dialog close
const handleInvitationDialogClose = () => {
    showInvitationDialog.value = false
    invitationDialogData.value = null
}

// Badge variants
const getRoleVariant = (role: string) => {
    switch (role) {
        case 'admin':
            return 'destructive'
        case 'user':
            return 'default'
        case 'viewer':
            return 'secondary'
        default:
            return 'outline'
    }
}

const getStatusVariant = (status: string) => {
    switch (status) {
        case 'active':
            return 'default'
        case 'inactive':
            return 'secondary'
        case 'pending':
            return 'outline'
        default:
            return 'outline'
    }
}

// Utility functions
const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Watchers
watch([roleFilter, statusFilter], () => {
    currentPage.value = 1
    loadUsers()
})

// Initialize
onMounted(() => {
    loadUsers()
})
</script>
