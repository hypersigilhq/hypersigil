<template>
  <GlobalTopbar />
  <router-view v-if="!isAuthenticated" />
  <AppLayout v-else />
  <ToastContainer />
  <GlobalConfirmationDialog />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { ToastContainer } from '@/components/ui/toast'
import GlobalConfirmationDialog from '@/components/ui/confirmation-dialog/GlobalConfirmationDialog.vue'
import { GlobalTopbar } from '@/components/ui/alert'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated, initAuth } = useAuth()

onMounted(async () => {
  await initAuth()
})
</script>
