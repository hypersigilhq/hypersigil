<template>
    <div class="container mx-auto p-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-3xl font-bold">Files</h1>
                <p class="text-muted-foreground">Manage your uploaded files</p>
            </div>
        </div>

        <FilesTable />
    </div>
</template>

<script setup lang="ts">
import FilesTable from '@/components/files/FilesTable.vue'
</script>
