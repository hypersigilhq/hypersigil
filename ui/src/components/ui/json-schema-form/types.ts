export type FormFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface FormField {
    name: string
    type: FormFieldType
    label: string
    description?: string
    required: boolean
    placeholder?: string
    defaultValue?: unknown
    validation?: {
        minLength?: number
        maxLength?: number
        minimum?: number
        maximum?: number
        pattern?: string
        enum?: string[]
        enumValues?: Array<{ value: string, description?: string }>
    }
    children?: FormField[]
    items?: FormField
}

export interface FormData {
    [key: string]: unknown
}

export interface FormErrors {
    [key: string]: string | undefined
}

export interface JsonSchemaFormProps {
    schema: Record<string, unknown>
    modelValue?: FormData
    readonly?: boolean
    class?: string
    hideSubmit?: boolean
}

export interface JsonSchemaFormEmits {
    (e: 'update:modelValue', value: FormData): void
    (e: 'submit', value: FormData): void
    (e: 'error', errors: FormErrors): void
}
