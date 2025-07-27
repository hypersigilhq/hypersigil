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
import { useGlobalEventListeners } from '@/services/global-event-listeners'

const { isAuthenticated, initAuth } = useAuth()
const { initialize, cleanup } = useGlobalEventListeners()

onMounted(async () => {
  await initAuth()

  // Initialize all global event listeners
  initialize()
})
</script>
