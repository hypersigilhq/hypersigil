<template>
    <div class="h-full flex flex-col">
        <div class="mb-6">
            <h1 class="text-3xl font-bold">Jobs</h1>
            <p class="text-muted-foreground mt-2">
                Monitor and manage background job processing and their status.
            </p>
        </div>

        <JobsTable />
    </div>
</template>

<script setup lang="ts">
import JobsTable from '@/components/jobs/JobsTable.vue'
</script>
