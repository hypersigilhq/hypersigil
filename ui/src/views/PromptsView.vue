<template>
    <div class="container mx-auto py-6">
        <div class="mb-6">
            <h1 class="text-3xl font-bold">Prompts</h1>
            <p class="text-muted-foreground mt-2">
                Manage your prompt templates and their JSON schema responses.
            </p>
        </div>

        <PromptsTable />
    </div>
</template>

<script setup lang="ts">
import PromptsTable from '@/components/prompts/PromptsTable.vue'
</script>
