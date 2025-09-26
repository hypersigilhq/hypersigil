<template>
    <div class="space-y-2">
        <Label :for="field.name" class="text-sm font-medium">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
        </Label>
        <Input :id="field.name" type="number" :model-value="modelValue as number" :placeholder="field.placeholder"
            :readonly="readonly" :min="field.validation?.minimum" :max="field.validation?.maximum"
            :class="{ 'border-red-500': error }"
            @update:model-value="$emit('update:modelValue', Number($event) || 0)" />
        <p v-if="field.description" class="text-xs text-gray-500">
            {{ field.description }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
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
    (e: 'update:modelValue', value: number): void
}>()
</script>
