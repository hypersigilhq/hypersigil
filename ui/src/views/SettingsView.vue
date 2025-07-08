<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
            <p class="text-muted-foreground">
                Manage your application settings and preferences.
            </p>
        </div>

        <Separator />

        <div class="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                        Update your profile information and preferences.
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-sm font-medium">First Name</label>
                            <input type="text" value="John"
                                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-sm font-medium">Last Name</label>
                            <input type="text" value="Doe"
                                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-medium">Email</label>
                        <input type="email" value="john@example.com"
                            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>Save Changes</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                        Configure how you receive notifications.
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="space-y-0.5">
                            <label class="text-sm font-medium">Email Notifications</label>
                            <p class="text-sm text-muted-foreground">
                                Receive notifications via email
                            </p>
                        </div>
                        <Button variant="outline" size="sm">Toggle</Button>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="space-y-0.5">
                            <label class="text-sm font-medium">Push Notifications</label>
                            <p class="text-sm text-muted-foreground">
                                Receive push notifications in your browser
                            </p>
                        </div>
                        <Button variant="outline" size="sm">Toggle</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
</script>
