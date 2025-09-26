<template>
    <div class="space-y-2">
        <Label :for="field.name" class="text-sm font-medium">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
        </Label>
        <Textarea v-if="field.validation?.maxLength && field.validation.maxLength > 100" :id="field.name"
            :model-value="modelValue as string | number" :placeholder="field.placeholder" :readonly="readonly"
            :class="{ 'border-red-500': error }" @update:model-value="$emit('update:modelValue', $event)" />
        <Input v-else :id="field.name" :model-value="modelValue as string | number" :placeholder="field.placeholder"
            :readonly="readonly" :class="{ 'border-red-500': error }"
            @update:model-value="$emit('update:modelValue', $event)" />
        <p v-if="field.description" class="text-xs text-gray-500">
            {{ field.description }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
    (e: 'update:modelValue', value: string | number): void
}>()
</script>
