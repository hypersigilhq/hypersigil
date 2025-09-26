<template>
    <div class="flex items-center space-x-2">
        <Checkbox :id="field.name" :model-value="modelValue as boolean | 'indeterminate' | null | undefined"
            :disabled="readonly" :class="{ 'border-red-500': error }"
            @update:model-value="$emit('update:modelValue', Boolean($event))" />
        <Label :for="field.name" class="text-sm font-medium">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
        </Label>
        <p v-if="field.description" class="text-xs text-gray-500 ml-2">
            {{ field.description }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { FormField } from './types'

interface Props {
    field: FormField
    modelValue: unknown
    readonly: boolean
    error?: boolean
}

defineProps<Props>()

defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()
</script>
