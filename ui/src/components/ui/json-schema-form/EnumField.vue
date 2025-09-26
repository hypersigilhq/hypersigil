<template>
    <div class="space-y-2">
        <Label :for="field.name" class="text-sm font-medium">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
        </Label>
        <Select :model-value="modelValue as string | null" :disabled="readonly"
            @update:model-value="$emit('update:modelValue', String($event || ''))">
            <SelectTrigger :class="{ 'border-red-500': error }">
                <SelectValue :placeholder="field.placeholder" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem v-for="option in field.validation?.enumValues || []" :key="option.value"
                    :value="option.value">
                    {{ option.value }}
                    <span v-if="option.description" class="text-xs text-gray-500 ml-2">
                        ({{ option.description }})
                    </span>
                </SelectItem>
            </SelectContent>
        </Select>
        <p v-if="field.description" class="text-xs text-gray-500">
            {{ field.description }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
    (e: 'update:modelValue', value: string): void
}>()
</script>
