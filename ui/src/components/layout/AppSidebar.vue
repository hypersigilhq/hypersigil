<template>
    <div class="flex h-full flex-col bg-white border-r transition-all duration-300 ease-in-out relative" :class="[
        isCollapsed ? 'w-16' : 'w-64',
        isHovered && isCollapsed ? 'shadow-lg' : ''
    ]" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
        <!-- Overlay expanded sidebar when collapsed and hovered -->
        <div v-if="isCollapsed && isHovered"
            class="absolute left-0 top-0 w-64 h-full bg-white border-r shadow-xl z-10 flex flex-col backdrop-blur-sm">
            <!-- Logo/Brand - Expanded -->
            <div class="flex h-16 items-center px-6 border-b">
                <h1 class="text-xl font-semibold">Vue App</h1>
                <Button variant="ghost" size="icon" class="ml-auto" @click="toggleCollapse"
                    :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
                    <PanelLeftClose v-if="!isCollapsed" class="h-4 w-4" />
                    <PanelLeftOpen v-else class="h-4 w-4" />
                </Button>
            </div>

            <!-- Navigation - Expanded -->
            <nav class="flex-1 space-y-1 p-4">
                <NavigationItem v-for="item in navigationItems" :key="item.name" :item="item" :is-collapsed="false"
                    @navigate="handleNavigate" />
            </nav>

            <!-- Footer - Expanded -->
            <Button @click="useAuth().logout()">Logout</Button>
            <div class="p-4 border-t">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User class="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ useAuth().currentUser.value?.name }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Regular sidebar content -->
        <div class="flex flex-col h-full">
            <!-- Logo/Brand -->
            <div class="flex h-16 items-center border-b" :class="isCollapsed ? 'px-3 justify-center' : 'px-6'">
                <h1 v-if="!isCollapsed" class="text-xl font-semibold">Vue App</h1>
                <div v-else class="w-8 h-8 bg-primary rounded flex items-center justify-center">
                    <Terminal class="w-4 h-4 text-primary-foreground" />
                </div>
                <Button v-if="!isCollapsed" variant="ghost" size="icon" class="ml-auto" @click="toggleCollapse"
                    :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
                    <PanelLeftClose class="h-4 w-4" />
                </Button>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 space-y-1 p-4">
                <NavigationItem v-for="item in navigationItems" :key="item.name" :item="item"
                    :is-collapsed="isCollapsed && !isHovered" @navigate="handleNavigate" />
            </nav>
            <Button v-if="!isCollapsed" @click="useAuth().logout()">Logout</Button>

            <!-- Footer -->
            <div class="border-t" :class="isCollapsed ? 'p-2' : 'p-4'">
                <div v-if="!isCollapsed" class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User class="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ useAuth().currentUser.value?.name }}</p>
                    </div>
                </div>
                <div v-else class="flex justify-center">
                    <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User class="w-4 h-4 text-primary-foreground" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Home, Settings, Info, User, FileText, Play, Database, Package, PanelLeftClose, PanelLeftOpen, Terminal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import NavigationItem from './NavigationItem.vue'
import { useAuth } from '@/composables/useAuth'

interface NavigationItemType {
    name: string
    path: string
    icon: any
    badge?: string
}

const route = useRoute()

const navigationItems = computed<NavigationItemType[]>(() => [
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
        name: 'Settings',
        path: '/settings',
        icon: Settings,
        // badge: 'New'
    },
])

const emit = defineEmits<{
    navigate: []
    'collapse-change': [collapsed: boolean]
}>()

// Sidebar collapse state
const isCollapsed = ref(false)
const isHovered = ref(false)

// Load saved state from localStorage
onMounted(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
        isCollapsed.value = JSON.parse(saved)
        emit('collapse-change', isCollapsed.value)
    }
})

const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed.value))
    emit('collapse-change', isCollapsed.value)
}

const handleMouseEnter = () => {
    if (isCollapsed.value) {
        isHovered.value = true
    }
}

const handleMouseLeave = () => {
    isHovered.value = false
}

const handleNavigate = () => {
    emit('navigate')
}
</script>
