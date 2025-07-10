<template>
    <div class="container mx-auto p-6">
        <div class="space-y-6">
            <!-- Header with breadcrumb -->
            <div class="flex items-center justify-between">
                <div class="space-y-2">
                    <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                        <router-link to="/test-data" class="hover:text-foreground">Test Data Groups</router-link>
                        <span>/</span>
                        <span>{{ groupName || 'Loading...' }}</span>
                    </div>
                    <h1 class="text-3xl font-bold tracking-tight">Test Data Items</h1>
                    <p class="text-muted-foreground">
                        Manage individual test data items in this group
                    </p>
                </div>
            </div>

            <!-- Test Data Items Table -->
            <TestDataItemsTable :group-id="groupId" @group-loaded="handleGroupLoaded" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TestDataItemsTable from '@/components/test-data/TestDataItemsTable.vue'

interface Props {
    groupId: string
}

const props = defineProps<Props>()
const groupName = ref<string>('')

const handleGroupLoaded = (name: string) => {
    groupName.value = name
}
</script>
