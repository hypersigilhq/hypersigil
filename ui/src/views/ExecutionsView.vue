<template>
    <div class="container mx-auto py-6">
        <div class="mb-6">
            <h1 class="text-3xl font-bold">Executions</h1>
            <p class="text-muted-foreground mt-2">
                Monitor and manage prompt execution requests and their status.
            </p>
        </div>

        <ExecutionsTable />
    </div>
</template>

<script setup lang="ts">
import ExecutionsTable from '@/components/executions/ExecutionsTable.vue'
</script>
