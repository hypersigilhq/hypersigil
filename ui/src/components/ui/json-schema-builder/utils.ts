import type { JsonSchema, SchemaBuilderNode, JsonSchemaType } from './types'

export function generateId(): string {
    return Math.random().toString(36).substr(2, 9)
}

export function createNode(
    name: string,
    type: JsonSchemaType,
    level: number = 0,
    parentId?: string
): SchemaBuilderNode {
    return {
        id: generateId(),
        name,
        type,
        required: false,
        expanded: true,
        level,
        parentId,
        children: type === 'object' ? [] : undefined,
        items: type === 'array' ? createNode('items', 'string', level + 1) : undefined
    }
}

export function convertToJsonSchema(nodes: SchemaBuilderNode[]): JsonSchema {
    const properties: Record<string, any> = {}
    const required: string[] = []

    for (const node of nodes) {
        const property = convertNodeToSchemaProperty(node)
        properties[node.name] = property

        if (node.required) {
            required.push(node.name)
        }
    }

    return {
        type: 'object',
        properties,
        required,
        additionalProperties: false
    }
}

function convertNodeToSchemaProperty(node: SchemaBuilderNode): any {
    const base: any = {
        type: node.type
    }

    if (node.description) {
        base.description = node.description
    }

    switch (node.type) {
        case 'object':
            if (node.children && node.children.length > 0) {
                base.properties = {}
                base.required = []

                for (const child of node.children) {
                    base.properties[child.name] = convertNodeToSchemaProperty(child)
                    if (child.required) {
                        base.required.push(child.name)
                    }
                }

                base.additionalProperties = false
            }
            break

        case 'array':
            if (node.items) {
                base.items = convertNodeToSchemaProperty(node.items)
            }
            break

        case 'string':
            if (node.enum && node.enum.length > 0) {
                base.enum = node.enum
            }
            if (node.minLength !== undefined) {
                base.minLength = node.minLength
            }
            if (node.maxLength !== undefined) {
                base.maxLength = node.maxLength
            }
            if (node.pattern) {
                base.pattern = node.pattern
            }
            break

        case 'number':
            if (node.minimum !== undefined) {
                base.minimum = node.minimum
            }
            if (node.maximum !== undefined) {
                base.maximum = node.maximum
            }
            break
    }

    if (node.default !== undefined) {
        base.default = node.default
    }

    return base
}

export function findNodeById(nodes: SchemaBuilderNode[], id: string): SchemaBuilderNode | null {
    for (const node of nodes) {
        if (node.id === id) {
            return node
        }
        if (node.children) {
            const found = findNodeById(node.children, id)
            if (found) return found
        }
        if (node.items && node.items.id === id) {
            return node.items
        }
    }
    return null
}

export function removeNodeById(nodes: SchemaBuilderNode[], id: string): SchemaBuilderNode[] {
    return nodes.filter(node => {
        if (node.id === id) {
            return false
        }
        if (node.children) {
            node.children = removeNodeById(node.children, id)
        }
        return true
    })
}

export function updateNodeById(
    nodes: SchemaBuilderNode[],
    id: string,
    updates: Partial<SchemaBuilderNode>
): SchemaBuilderNode[] {
    return nodes.map(node => {
        if (node.id === id) {
            return { ...node, ...updates }
        }

        let updatedNode = { ...node }

        if (node.children) {
            const updatedChildren = updateNodeById(node.children, id, updates)
            if (updatedChildren !== node.children) {
                updatedNode.children = updatedChildren
            }
        }

        if (node.items && node.items.id === id) {
            updatedNode.items = { ...node.items, ...updates }
        } else if (node.items) {
            const updatedItems = updateNodeById([node.items], id, updates)
            if (updatedItems[0] !== node.items) {
                updatedNode.items = updatedItems[0]
            }
        }

        return updatedNode
    })
}

export function flattenNodes(nodes: SchemaBuilderNode[]): SchemaBuilderNode[] {
    const result: SchemaBuilderNode[] = []

    function traverse(nodeList: SchemaBuilderNode[]) {
        for (const node of nodeList) {
            result.push(node)
            if (node.expanded && node.children) {
                traverse(node.children)
            }
            if (node.expanded && node.items) {
                result.push(node.items)
            }
        }
    }

    traverse(nodes)
    return result
}

export function convertJsonSchemaToNodes(schema: JsonSchema): SchemaBuilderNode[] {
    if (!schema.properties) {
        return []
    }

    const nodes: SchemaBuilderNode[] = []

    for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
        const node = convertSchemaPropertyToNode(
            propertyName,
            propertySchema,
            0,
            schema.required?.includes(propertyName) || false
        )
        nodes.push(node)
    }

    return nodes
}

function convertSchemaPropertyToNode(
    name: string,
    property: any,
    level: number,
    required: boolean = false,
    parentId?: string
): SchemaBuilderNode {
    const node: SchemaBuilderNode = {
        id: generateId(),
        name,
        type: property.type as JsonSchemaType,
        required,
        expanded: true,
        level,
        parentId,
        description: property.description
    }

    // Copy type-specific properties
    if (property.enum) node.enum = property.enum
    if (property.default !== undefined) node.default = property.default
    if (property.minimum !== undefined) node.minimum = property.minimum
    if (property.maximum !== undefined) node.maximum = property.maximum
    if (property.minLength !== undefined) node.minLength = property.minLength
    if (property.maxLength !== undefined) node.maxLength = property.maxLength
    if (property.pattern) node.pattern = property.pattern

    // Handle object type
    if (property.type === 'object' && property.properties) {
        node.children = []
        for (const [childName, childProperty] of Object.entries(property.properties)) {
            const childNode = convertSchemaPropertyToNode(
                childName,
                childProperty,
                level + 1,
                property.required?.includes(childName) || false,
                node.id
            )
            node.children.push(childNode)
        }
    }

    // Handle array type
    if (property.type === 'array' && property.items) {
        node.items = convertSchemaPropertyToNode(
            'items',
            property.items,
            level + 1,
            false,
            node.id
        )
    }

    return node
}
