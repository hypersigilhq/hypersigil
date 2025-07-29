<template>
    <Button variant="ghost" size="icon" class="ml-2 h-2 w-2" @click="handleCopy">
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
import { copyToClipboard } from '@/services/clipboard'
import { useUI } from '@/services/ui'

interface Props {
    text: string
    showToast?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    showToast: false
})

const copied = ref(false)
const { success, error } = useUI()

const handleCopy = async () => {
    const result = await copyToClipboard(props.text)

    if (result.success) {
        copied.value = true

        if (props.showToast) {
            success('Copied to clipboard')
        }

        // Reset copied state after 500ms
        setTimeout(() => {
            copied.value = false
        }, 500)
    } else {
        if (props.showToast) {
            error(`Failed to copy: ${result.error}`)
        } else {
            console.error('Failed to copy:', result.error)
        }
    }
}
</script>
