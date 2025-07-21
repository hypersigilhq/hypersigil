<template>
    <div>
        <div v-if="isLoading" class="flex min-h-screen items-center justify-center">
            <!-- Loading spinner -->
            <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>

        <RegisterFirstAdminView v-else-if="shouldShowRegisterFirstAdmin" />
        <LoginView v-else />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import LoginView from '@/views/auth/LoginView.vue'
import RegisterFirstAdminView from '@/views/auth/RegisterFirstAdminView.vue'

const { checkAuthStatus } = useAuth()
const isLoading = ref(true)
const shouldShowRegisterFirstAdmin = ref(false)
const error = ref<Error | null>(null)

onMounted(async () => {
    try {
        const response = await checkAuthStatus()
        shouldShowRegisterFirstAdmin.value = response.shouldRedirectToRegisterFirstAdmin
    } catch (err) {
        console.error('Error checking auth status:', err)
        error.value = err instanceof Error ? err : new Error('Unknown error')
    } finally {
        isLoading.value = false
    }
})
</script>
