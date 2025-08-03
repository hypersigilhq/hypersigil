export type JsonSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface JsonSchemaProperty {
    id: string
    name: string
    type: JsonSchemaType
    required: boolean
    description?: string
    properties?: JsonSchemaProperty[]
    items?: JsonSchemaProperty
    enum?: string[]
    default?: any
    minimum?: number
    maximum?: number
    minLength?: number
    maxLength?: number
    pattern?: string
}

export interface JsonSchema {
    type: 'object'
    properties: Record<string, any>
    required: string[]
    additionalProperties?: boolean
}

export interface SchemaBuilderNode {
    id: string
    name: string
    type: JsonSchemaType
    required: boolean
    description?: string
    expanded: boolean
    level: number
    parentId?: string
    children?: SchemaBuilderNode[]
    // Type-specific properties
    enum?: string[]
    default?: any
    minimum?: number
    maximum?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    items?: SchemaBuilderNode
}
