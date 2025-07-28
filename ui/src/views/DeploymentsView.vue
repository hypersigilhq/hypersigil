<template>
    <div class="h-full flex flex-col">
        <div class="mb-6">
            <h1 class="text-3xl font-bold">Deployments</h1>
            <p class="text-muted-foreground mt-2">
                Manage your prompt deployments with specific AI providers and models.
            </p>
        </div>

        <DeploymentsTable />
    </div>
</template>

<script setup lang="ts">
import DeploymentsTable from '@/components/deployments/DeploymentsTable.vue'
</script>
