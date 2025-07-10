<template>
    <div class="flex h-full flex-col bg-card border-r">
        <!-- Logo/Brand -->
        <div class="flex h-16 items-center px-6 border-b">
            <h1 class="text-xl font-semibold">Vue App</h1>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 p-4">
            <NavigationItem v-for="item in navigationItems" :key="item.name" :item="item" @navigate="handleNavigate" />
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User class="w-4 h-4 text-primary-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">John Doe</p>
                    <p class="text-xs text-muted-foreground truncate">john@example.com</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Home, Settings, Info, User, FileText, Play, Database } from 'lucide-vue-next'
import NavigationItem from './NavigationItem.vue'

interface NavigationItemType {
    name: string
    path: string
    icon: any
    badge?: string
}

const route = useRoute()

const navigationItems = computed<NavigationItemType[]>(() => [
    {
        name: 'Dashboard',
        path: '/',
        icon: Home,
    },
    {
        name: 'Prompts',
        path: '/prompts',
        icon: FileText,
    },
    {
        name: 'Executions',
        path: '/executions',
        icon: Play,
    },
    {
        name: 'Test Data',
        path: '/test-data',
        icon: Database,
    },
    {
        name: 'About',
        path: '/about',
        icon: Info,
    },
    {
        name: 'Settings',
        path: '/settings',
        icon: Settings,
        badge: 'New'
    },
])

const emit = defineEmits<{
    navigate: []
}>()

const handleNavigate = () => {
    emit('navigate')
}
</script>
