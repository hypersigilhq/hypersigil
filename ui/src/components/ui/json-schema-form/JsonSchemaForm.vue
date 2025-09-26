<template>
    <form @submit.prevent="handleSubmit" :class="cn('space-y-6', props.class)">
        <div v-for="field in fields" :key="field.name" class="space-y-2">
            <component :is="getFieldComponent(field)" v-bind="getFieldProps(field)" v-model="formData[field.name]"
                @update:model-value="handleFieldUpdate(field.name, $event)" />

            <!-- Error message -->
            <p v-if="errors[field.name]" class="text-sm text-red-600">
                {{ errors[field.name] }}
            </p>
        </div>

        <!-- Submit button -->
        <div v-if="!readonly && !hideSubmit" class="flex justify-end">
            <Button type="submit" :disabled="hasErrors">
                Submit
            </Button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import TextField from './TextField.vue'
import NumberField from './NumberField.vue'
import BooleanField from './BooleanField.vue'
import EnumField from './EnumField.vue'
import ObjectField from './ObjectField.vue'
import ArrayField from './ArrayField.vue'
import type { JsonSchemaFormProps, JsonSchemaFormEmits, FormField, FormData, FormErrors } from './types'
import { parseJsonSchema, validateFormData, initializeFormData } from './utils'

const props = withDefaults(defineProps<JsonSchemaFormProps>(), {
    readonly: false,
    hideSubmit: false
})

const emit = defineEmits<JsonSchemaFormEmits>()

// Parse schema into form fields
const fields = ref<FormField[]>([])
const formData = ref<FormData>({})
const errors = ref<FormErrors>({})

// Initialize form when schema changes
watch(() => props.schema, (newSchema) => {
    if (newSchema) {
        fields.value = parseJsonSchema(newSchema)
        formData.value = props.modelValue || initializeFormData(fields.value)
        validateForm()
    }
}, { immediate: true })

// Update form data when modelValue changes
watch(() => props.modelValue, (newValue) => {
    if (newValue) {
        formData.value = { ...newValue }
        validateForm()
    }
}, { deep: true })

// Validate form data
const hasErrors = computed(() => Object.keys(errors.value).length > 0)

function validateForm() {
    errors.value = validateFormData(fields.value, formData.value)
    emit('error', errors.value)
}

function handleFieldUpdate(fieldName: string, value: unknown) {
    formData.value[fieldName] = value
    validateForm()
    emit('update:modelValue', { ...formData.value })
}

function handleSubmit() {
    if (!hasErrors.value) {
        emit('submit', { ...formData.value })
    }
}

function getFieldComponent(field: FormField) {
    switch (field.type) {
        case 'string':
            return field.validation?.enum ? EnumField : TextField
        case 'number':
            return NumberField
        case 'boolean':
            return BooleanField
        case 'object':
            return ObjectField
        case 'array':
            return ArrayField
        default:
            return TextField
    }
}

function getFieldProps(field: FormField) {
    return {
        field,
        readonly: props.readonly,
        error: !!errors.value[field.name]
    }
}
</script>
