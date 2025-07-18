<template>
    <div class="min-h-screen bg-background">
        <!-- Mobile menu button -->
        <div class="lg:hidden">
            <Sheet v-model:open="isMobileMenuOpen">
                <SheetTrigger as-child>
                    <Button variant="ghost" size="icon" class="fixed top-4 left-4 z-50 lg:hidden">
                        <Menu class="h-6 w-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" class="w-64 p-0">
                    <AppSidebar @navigate="closeMobileMenu" />
                </SheetContent>
            </Sheet>
        </div>

        <!-- Desktop layout -->
        <div class="lg:flex">
            <!-- Desktop sidebar -->
            <div class="hidden lg:block lg:flex-shrink-0 transition-all duration-300 ease-in-out"
                :class="sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'">
                <div class="fixed inset-y-0 left-0 transition-all duration-300 ease-in-out"
                    :class="sidebarCollapsed ? 'w-16' : 'w-64'">
                    <AppSidebar @collapse-change="handleSidebarCollapseChange" />
                </div>
            </div>

            <!-- Main content -->
            <div class="flex-1 transition-all duration-300 ease-in-out">
                <main class="p-6">
                    <router-view />
                </main>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Menu } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import AppSidebar from './AppSidebar.vue'

const isMobileMenuOpen = ref(false)
const sidebarCollapsed = ref(false)

const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
}

const handleSidebarCollapseChange = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
}
</script>
