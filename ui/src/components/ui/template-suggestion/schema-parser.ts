export interface SchemaPath {
    path: string
    type: string
    description?: string
    isArray?: boolean
}

export function parseJsonSchema(schema: any, prefix = "", paths: SchemaPath[] = []): SchemaPath[] {
    if (!schema || typeof schema !== "object") return paths

    // Handle object properties
    if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
            const currentPath = prefix ? `${prefix}.${key}` : key

            // Add the current path
            paths.push({
                path: currentPath,
                type: value.type || "unknown",
                description: value.description,
                isArray: value.type === "array",
            })

            // Recursively parse nested objects
            if (value.type === "object" && value.properties) {
                parseJsonSchema(value, currentPath, paths)
            }

            // Handle arrays
            if (value.type === "array" && value.items) {
                if (value.items.type === "object" && value.items.properties) {
                    // For array of objects, add indexed paths
                    parseJsonSchema(value.items, `${currentPath}[0]`, paths)
                } else {
                    // For array of primitives
                    paths.push({
                        path: `${currentPath}[0]`,
                        type: value.items.type || "unknown",
                        description: `Array item of ${value.items.type || "unknown"}`,
                        isArray: false,
                    })
                }
            }
        })
    }

    return paths
}
