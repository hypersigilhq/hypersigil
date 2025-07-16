<template>
    <Button variant="ghost" size="icon" class="ml-2 h-2 w-2" @click="copyToClipboard">
        <Copy :class="[
            'h-4 w-4',
            copied ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'
        ]" />
    </Button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Copy } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
    text: string
}

const props = defineProps<Props>()

const copied = ref(false)

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(props.text)
        copied.value = true

        // Reset copied state after 2 seconds
        setTimeout(() => {
            copied.value = false
        }, 500)
    } catch (err) {
        console.error('Failed to copy:', err)
    }
}
</script>
