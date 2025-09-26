<template>
    <div class="space-y-4">
        <Label class="text-sm font-medium">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
        </Label>
        <div class="border rounded-md p-4 space-y-4" :class="{ 'border-red-500': error }">
            <JsonSchemaForm v-if="field.children"
                :schema="{ properties: Object.fromEntries(field.children.map(f => [f.name, { type: f.type, ...f.validation }])), required: field.children.filter(f => f.required).map(f => f.name) }"
                :model-value="modelValue as Record<string, unknown>" :readonly="readonly"
                @update:model-value="$emit('update:modelValue', $event)" />
        </div>
        <p v-if="field.description" class="text-xs text-gray-500">
            {{ field.description }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { Label } from '@/components/ui/label'
import JsonSchemaForm from './JsonSchemaForm.vue'
import type { FormField } from './types'

interface Props {
    field: FormField
    modelValue: unknown
    readonly: boolean
    error?: boolean
}

defineProps<Props>()

defineEmits<{
    (e: 'update:modelValue', value: Record<string, unknown>): void
}>()
</script>
