import type { FormField, FormFieldType, FormData, FormErrors } from './types'

export function parseJsonSchema(schema: Record<string, unknown>): FormField[] {
    if (!schema.properties || typeof schema.properties !== 'object') {
        return []
    }

    const required = Array.isArray(schema.required) ? schema.required : []
    const properties = schema.properties as Record<string, unknown>

    return Object.entries(properties).map(([name, property]) => {
        return convertPropertyToFormField(name, property, required.includes(name))
    })
}

function convertPropertyToFormField(
    name: string,
    property: unknown,
    required: boolean
): FormField {
    if (!property || typeof property !== 'object') {
        return createBasicFormField(name, 'string', required)
    }

    const prop = property as Record<string, unknown>
    const type = getFieldType(prop.type)
    const description = typeof prop.description === 'string' ? prop.description : undefined

    const field: FormField = {
        name,
        type,
        label: formatLabel(name),
        description,
        required,
        placeholder: getPlaceholder(type, description),
        defaultValue: prop.default,
        validation: extractValidation(prop)
    }

    // Handle object type
    if (type === 'object' && prop.properties && typeof prop.properties === 'object') {
        const childRequired = Array.isArray(prop.required) ? prop.required : []
        const childProperties = prop.properties as Record<string, unknown>

        field.children = Object.entries(childProperties).map(([childName, childProperty]) => {
            return convertPropertyToFormField(childName, childProperty, childRequired.includes(childName))
        })
    }

    // Handle array type
    if (type === 'array' && prop.items && typeof prop.items === 'object') {
        field.items = convertPropertyToFormField('item', prop.items, false)
    }

    return field
}

function getFieldType(type: unknown): FormFieldType {
    if (typeof type === 'string') {
        switch (type) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'object':
            case 'array':
                return type
            default:
                return 'string'
        }
    }

    // Handle union types like ["string", "null"]
    if (Array.isArray(type)) {
        const nonNullTypes = type.filter(t => t !== 'null' && typeof t === 'string')
        if (nonNullTypes.length > 0) {
            return getFieldType(nonNullTypes[0])
        }
    }

    return 'string'
}

function createBasicFormField(name: string, type: FormFieldType, required: boolean): FormField {
    return {
        name,
        type,
        label: formatLabel(name),
        required,
        placeholder: getPlaceholder(type)
    }
}

function formatLabel(name: string): string {
    // Convert camelCase to Title Case
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
}

function getPlaceholder(type: FormFieldType, description?: string): string {
    if (description) {
        return description
    }

    switch (type) {
        case 'string':
            return 'Enter text...'
        case 'number':
            return 'Enter number...'
        case 'boolean':
            return ''
        case 'object':
            return ''
        case 'array':
            return ''
        default:
            return 'Enter value...'
    }
}

function extractValidation(prop: Record<string, unknown>): FormField['validation'] {
    const validation: FormField['validation'] = {}

    // String validations
    if (typeof prop.minLength === 'number') validation.minLength = prop.minLength
    if (typeof prop.maxLength === 'number') validation.maxLength = prop.maxLength
    if (typeof prop.pattern === 'string') validation.pattern = prop.pattern

    // Number validations
    if (typeof prop.minimum === 'number') validation.minimum = prop.minimum
    if (typeof prop.maximum === 'number') validation.maximum = prop.maximum

    // Enum validations
    if (Array.isArray(prop.enum)) {
        validation.enum = prop.enum.map(String)
        validation.enumValues = prop.enum.map(value => ({ value: String(value) }))
    }

    return Object.keys(validation).length > 0 ? validation : undefined
}

export function validateFormData(fields: FormField[], data: FormData): FormErrors {
    const errors: FormErrors = {}

    for (const field of fields) {
        const value = data[field.name]
        const error = validateField(field, value)
        if (error) {
            errors[field.name] = error
        }

        // Validate nested fields
        if (field.type === 'object' && field.children && typeof value === 'object' && value !== null) {
            const nestedErrors = validateFormData(field.children, value as FormData)
            Object.assign(errors, Object.fromEntries(
                Object.entries(nestedErrors).map(([key, error]) => [`${field.name}.${key}`, error])
            ))
        }

        // Validate array items
        if (field.type === 'array' && field.items && Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const itemValue = value[i]
                const itemError = validateField(field.items, itemValue)
                if (itemError) {
                    errors[`${field.name}[${i}]`] = itemError
                }
            }
        }
    }

    return errors
}

function validateField(field: FormField, value: unknown): string | undefined {
    // Required field validation
    if (field.required && (value === undefined || value === null || value === '')) {
        return `${field.label} is required`
    }

    // Skip further validation if value is empty and field is not required
    if (!field.required && (value === undefined || value === null || value === '')) {
        return undefined
    }

    // Type validation
    const typeError = validateType(field.type, value)
    if (typeError) return typeError

    // Validation rules
    if (field.validation) {
        const validation = field.validation

        if (field.type === 'string' && typeof value === 'string') {
            if (validation.minLength && value.length < validation.minLength) {
                return `${field.label} must be at least ${validation.minLength} characters`
            }
            if (validation.maxLength && value.length > validation.maxLength) {
                return `${field.label} must be at most ${validation.maxLength} characters`
            }
            if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
                return `${field.label} format is invalid`
            }
            if (validation.enum && !validation.enum.includes(value)) {
                return `${field.label} must be one of: ${validation.enum.join(', ')}`
            }
        }

        if (field.type === 'number' && typeof value === 'number') {
            if (validation.minimum !== undefined && value < validation.minimum) {
                return `${field.label} must be at least ${validation.minimum}`
            }
            if (validation.maximum !== undefined && value > validation.maximum) {
                return `${field.label} must be at most ${validation.maximum}`
            }
        }
    }

    return undefined
}

function validateType(type: FormFieldType, value: unknown): string | undefined {
    switch (type) {
        case 'string':
            if (typeof value !== 'string') return 'Must be a string'
            break
        case 'number':
            if (typeof value !== 'number' || isNaN(value)) return 'Must be a number'
            break
        case 'boolean':
            if (typeof value !== 'boolean') return 'Must be true or false'
            break
        case 'object':
            if (typeof value !== 'object' || value === null) return 'Must be an object'
            break
        case 'array':
            if (!Array.isArray(value)) return 'Must be an array'
            break
    }
    return undefined
}

export function initializeFormData(fields: FormField[]): FormData {
    const data: FormData = {}

    for (const field of fields) {
        if (field.defaultValue !== undefined) {
            data[field.name] = field.defaultValue
        } else {
            // Set default values based on type
            switch (field.type) {
                case 'string':
                    data[field.name] = ''
                    break
                case 'number':
                    data[field.name] = 0
                    break
                case 'boolean':
                    data[field.name] = false
                    break
                case 'object':
                    data[field.name] = field.children ? initializeFormData(field.children) : {}
                    break
                case 'array':
                    data[field.name] = []
                    break
            }
        }
    }

    return data
}
