<template>
    <ConfirmationDialog :open="dialogState.isOpen" :title="dialogState.options.title"
        :message="dialogState.options.message" :confirm-text="dialogState.options.confirmText"
        :cancel-text="dialogState.options.cancelText" :variant="dialogState.options.variant"
        :icon="dialogState.options.icon" @confirm="handleConfirm" @cancel="handleCancel"
        @update:open="handleOpenChange" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { useConfirmationDialogStore } from './useConfirmationDialog'

const store = useConfirmationDialogStore()
const dialogState = computed(() => store.dialogState.value)

const handleConfirm = () => {
    store.handleConfirm()
}

const handleCancel = () => {
    store.handleCancel()
}

const handleOpenChange = (open: boolean) => {
    if (!open) {
        store.handleCancel()
    }
}
</script>
