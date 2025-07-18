<template>
  <AppLayout />
  <ToastContainer />
  <GlobalConfirmationDialog />
</template>

<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
import { ToastContainer } from '@/components/ui/toast'
import GlobalConfirmationDialog from '@/components/ui/confirmation-dialog/GlobalConfirmationDialog.vue'
</script>
