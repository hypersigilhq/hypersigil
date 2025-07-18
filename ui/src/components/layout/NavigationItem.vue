<template>
    <div class="relative">
        <router-link :to="item.path"
            class="group flex items-center text-sm font-medium rounded-md transition-colors duration-200" :class="[
                isCollapsed ? 'px-3 py-2 justify-center' : 'px-3 py-2',
                isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            ]" @click="handleClick" :title="isCollapsed ? item.name : undefined">
            <component :is="item.icon" :class="[
                'mr-3 h-5 w-5 flex-shrink-0 ml-3',
                isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-accent-foreground'
            ]" />
            <span v-if="!isCollapsed" class="flex-1">{{ item.name }}</span>
            <span v-if="item.badge && !isCollapsed"
                class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {{ item.badge }}
            </span>
            <!-- Badge indicator for collapsed state -->
            <div v-if="item.badge && isCollapsed" class="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full">
            </div>
        </router-link>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface NavigationItem {
    name: string
    path: string
    icon: any
    badge?: string
}

interface Props {
    item: NavigationItem
    isCollapsed?: boolean
}

const props = defineProps<Props>()
const route = useRoute()

const isActive = computed(() => {
    if (props.item.path === '/') {
        return route.path === '/'
    }
    return route.path.startsWith(props.item.path)
})

const emit = defineEmits<{
    navigate: []
}>()

const handleClick = () => {
    emit('navigate')
}
</script>
