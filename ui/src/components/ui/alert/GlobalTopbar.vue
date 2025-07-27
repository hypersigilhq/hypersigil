<template>
    <Transition enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="transform -translate-y-full opacity-0" enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition-all duration-300 ease-in" leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-full opacity-0">
        <div v-if="currentAlert" class="fixed top-0 left-0 right-0 z-[100] shadow-md">
            <Alert :title="currentAlert.title" :description="currentAlert.description" :variant="currentAlert.variant"
                :dismissible="currentAlert.dismissible" @dismiss="dismissAlert(currentAlert.id)" />
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { Alert } from './index'
import { useTopbarAlert } from './useTopbarAlert'

const { currentAlert, dismissAlert } = useTopbarAlert()
</script>
