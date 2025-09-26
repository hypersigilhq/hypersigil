<template>
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">
                {{ field.label }}
                <span v-if="field.required" class="text-red-500">*</span>
            </Label>
            <Button v-if="!readonly" type="button" variant="outline" size="sm" @click="addItem">
                Add Item
            </Button>
        </div>
        <div class="space-y-2" :class="{ 'border-red-500 border rounded-md p-2': error }">
            <div v-for="(item, index) in items" :key="index" class="flex items-center space-x-2 border rounded-md p-2">
                <div class="flex-1">
                    <component v-if="field.items" :is="getItemComponent()" :field="field.items" :model-value="item"
                        :readonly="readonly" @update:model-value="updateItem(index, $event)" />
                </div>
                <Button v-if="!readonly" type="button" variant="outline" size="sm" @click="removeItem(index)">
                    Remove
                </Button>
            </div>
            <p v-if="items.length === 0" class="text-sm text-gray-500 text-center py-4">
                No items yet. Click "Add Item" to get started.
            </p>
        </div>
        <p v-if="field.description" class="text-xs text-gray-500">
            {{ field.description }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import TextField from './TextField.vue'
import NumberField from './NumberField.vue'
import BooleanField from './BooleanField.vue'
import EnumField from './EnumField.vue'
import ObjectField from './ObjectField.vue'
import type { FormField } from './types'

interface Props {
    field: FormField
    modelValue: unknown
    readonly: boolean
    error?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: unknown[]): void
}>()

const items = ref<unknown[]>(Array.isArray(props.modelValue) ? props.modelValue : [])

watch(() => props.modelValue, (newVal) => {
    items.value = Array.isArray(newVal) ? newVal : []
}, { deep: true })

function addItem() {
    if (props.readonly) return
    const defaultValue = getDefaultValue()
    items.value.push(defaultValue)
    emit('update:modelValue', [...items.value])
}

function removeItem(index: number) {
    if (props.readonly) return
    items.value.splice(index, 1)
    emit('update:modelValue', [...items.value])
}

function updateItem(index: number, value: unknown) {
    items.value[index] = value
    emit('update:modelValue', [...items.value])
}

function getDefaultValue(): unknown {
    if (!props.field.items) return ''
    switch (props.field.items.type) {
        case 'string': return ''
        case 'number': return 0
        case 'boolean': return false
        case 'object': return {}
        case 'array': return []
        default: return ''
    }
}

function getItemComponent() {
    if (!props.field.items) return TextField

    switch (props.field.items.type) {
        case 'string':
            return props.field.items.validation?.enum ? EnumField : TextField
        case 'number':
            return NumberField
        case 'boolean':
            return BooleanField
        case 'object':
            return ObjectField
        case 'array':
            return TextField // TODO: Handle nested arrays
        default:
            return TextField
    }
}
</script>
