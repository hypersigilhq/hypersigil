<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
            <p class="text-muted-foreground">
                Manage your application settings and preferences.
            </p>
        </div>

        <Separator />

        <Tabs default-value="general" class="w-full">
            <TabsList class="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            </TabsList>

            <TabsContent value="general" class="space-y-4">
                <div>
                    <h3 class="text-lg font-medium">General Settings</h3>
                    <p class="text-sm text-muted-foreground">
                        Manage general application settings and configurations.
                    </p>
                </div>
                <LlmApiKeysTable />
                <WebhookDestinationsTable />
            </TabsContent>

            <TabsContent value="users" class="space-y-4">
                <div>
                    <h3 class="text-lg font-medium">User Management</h3>
                    <p class="text-sm text-muted-foreground">
                        Manage user accounts, roles, and permissions.
                    </p>
                </div>
                <UsersTable />
            </TabsContent>

            <TabsContent value="api-keys" class="space-y-4">
                <ApiKeysTable />
            </TabsContent>
        </Tabs>
    </div>
</template>

<script setup lang="ts">
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UsersTable from '@/components/settings/UsersTable.vue'
import ApiKeysTable from '@/components/settings/ApiKeysTable.vue'
import LlmApiKeysTable from '@/components/settings/LlmApiKeysTable.vue'
import WebhookDestinationsTable from '@/components/settings/WebhookDestinationsTable.vue'
</script>
