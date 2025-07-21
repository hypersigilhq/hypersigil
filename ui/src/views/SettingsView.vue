<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
            <p class="text-muted-foreground">
                Manage your application settings and preferences.
            </p>
        </div>

        <Separator />

        <Tabs default-value="users" class="w-full">
            <TabsList class="grid w-full grid-cols-4">
                <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="users" class="space-y-4">
                <div>
                    <h3 class="text-lg font-medium">User Management</h3>
                    <p class="text-sm text-muted-foreground">
                        Manage user accounts, roles, and permissions.
                    </p>
                </div>
                <UsersTable />
            </TabsContent>


        </Tabs>
    </div>
</template>

<script setup lang="ts">
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UsersTable from '@/components/settings/UsersTable.vue'
</script>
