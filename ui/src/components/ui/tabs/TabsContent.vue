<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { TabsContent, type TabsContentProps, injectTabsRootContext } from 'reka-ui'
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps<TabsContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

// Get the tabs context to check if this tab is active
const rootContext = injectTabsRootContext()
const isActive = computed(() => rootContext.modelValue.value === props.value)
</script>

<template>
  <TabsContent v-if="isActive"
    :class="cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', props.class)"
    v-bind="delegatedProps">
    <slot />
  </TabsContent>
</template>
