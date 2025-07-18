<template>
    <Teleport to="body">
        <div v-if="toasts.length > 0"
            class="fixed top-0 z-[60] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
            <TransitionGroup name="toast" tag="div" class="space-y-2">
                <Toast v-for="toast in toasts" :key="toast.id" :title="toast.title" :description="toast.description"
                    :variant="toast.variant" :dismissible="toast.dismissible" :action="toast.action"
                    @dismiss="removeToast(toast.id)" />
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Toast from './Toast.vue'
import { useToastStore } from './useToast'

const toastStore = useToastStore()
const toasts = computed(() => toastStore.toasts.value)

const removeToast = (id: string) => {
    toastStore.removeToast(id)
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.toast-leave-to {
    opacity: 0;
    transform: translateX(100%);
}

.toast-move {
    transition: transform 0.3s ease;
}
</style>
