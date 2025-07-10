<template>
    <div class="container mx-auto p-6">
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-bold tracking-tight">Test Data Groups</h1>
                    <p class="text-muted-foreground">
                        Manage your test data collections for prompt testing
                    </p>
                </div>
            </div>

            <!-- Test Data Groups Table -->
            <TestDataGroupsTable />
        </div>
    </div>
</template>

<script setup lang="ts">
import TestDataGroupsTable from '@/components/test-data/TestDataGroupsTable.vue'
</script>
