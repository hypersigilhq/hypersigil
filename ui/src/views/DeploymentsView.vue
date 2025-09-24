<template>
    <div class="h-full flex flex-col">
        <div class="mb-6">
            <h1 class="text-3xl font-bold">Deployments</h1>
            <p class="text-muted-foreground mt-2">
                Manage your prompt deployments with specific AI providers and models.
            </p>
        </div>

        <div class="space-y-8">
            <DeploymentsTable />

            <div>
                <h2 class="text-2xl font-semibold mb-4">Deployment Embeddings</h2>
                <p class="text-muted-foreground mb-4">
                    Manage your embedding deployments for generating vector representations.
                </p>
                <DeploymentEmbeddingTable />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import DeploymentsTable from '@/components/deployments/DeploymentsTable.vue'
import DeploymentEmbeddingTable from '@/components/deployments/DeploymentEmbeddingTable.vue'
</script>
