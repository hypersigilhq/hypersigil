export interface MustacheSection {
    path: string
    type: 'section' | 'inverted' | 'partial'
    startPos: number
    endPos?: number
}

export interface ContextualPath {
    path: string
    type: string
    description?: string
    isArray?: boolean
    isContextual?: boolean
    fullPath?: string
}

/**
 * Parse a Mustache template to find all sections and their boundaries
 */
export function parseMustacheTemplate(template: string): MustacheSection[] {
    const sections: MustacheSection[] = []
    const openSections: MustacheSection[] = []

    // Regex to match Mustache tags: {{#section}}, {{^inverted}}, {{/section}}, {{variable}}
    const mustacheRegex = /\{\{([#^/]?)([^}]+)\}\}/g
    let match

    while ((match = mustacheRegex.exec(template)) !== null) {
        const [fullMatch, prefix, content] = match
        const trimmedContent = content.trim()
        const startPos = match.index

        if (prefix === '#') {
            // Opening section tag
            const section: MustacheSection = {
                path: trimmedContent,
                type: 'section',
                startPos: startPos + fullMatch.length
            }
            sections.push(section)
            openSections.push(section)
        } else if (prefix === '^') {
            // Opening inverted section tag
            const section: MustacheSection = {
                path: trimmedContent,
                type: 'inverted',
                startPos: startPos + fullMatch.length
            }
            sections.push(section)
            openSections.push(section)
        } else if (prefix === '/') {
            // Closing section tag
            // Find the most recent unclosed section with matching path
            for (let i = openSections.length - 1; i >= 0; i--) {
                if (openSections[i].path === trimmedContent && !openSections[i].endPos) {
                    openSections[i].endPos = startPos
                    openSections.splice(i, 1)
                    break
                }
            }
        }
        // Regular variables (no prefix) are ignored for context parsing
    }

    return sections
}

/**
 * Determine the current context based on cursor position
 */
export function getCurrentContext(template: string, cursorPos: number): string[] {
    const sections = parseMustacheTemplate(template)
    const activeContexts: string[] = []

    for (const section of sections) {
        // Check if cursor is within this section
        if (section.startPos <= cursorPos && (section.endPos === undefined || section.endPos > cursorPos)) {
            activeContexts.push(section.path)
        }
    }

    return activeContexts
}

/**
 * Generate contextual paths based on current context and schema
 */
export function generateContextualPaths(schema: any, currentContext: string[]): ContextualPath[] {
    if (!schema || !currentContext.length) return []

    const paths: ContextualPath[] = []

    // Navigate to the current context in the schema
    let contextSchema = schema
    let contextPath = ''

    for (const contextKey of currentContext) {
        if (contextSchema?.properties?.[contextKey]) {
            contextSchema = contextSchema.properties[contextKey]
            contextPath = contextPath ? `${contextPath}.${contextKey}` : contextKey

            // If this is an array, get the items schema
            if (contextSchema.type === 'array' && contextSchema.items) {
                contextSchema = contextSchema.items
                contextPath = `${contextPath}[0]`
            }
        } else {
            // Context not found in schema
            return []
        }
    }

    // Generate paths from the current context
    if (contextSchema?.properties) {
        Object.entries(contextSchema.properties).forEach(([key, value]: [string, any]) => {
            const fullPath = contextPath ? `${contextPath}.${key}` : key

            paths.push({
                path: key, // Short path for contextual use
                fullPath,
                type: value.type || 'unknown',
                description: value.description,
                isArray: value.type === 'array',
                isContextual: true
            })

            // Handle nested objects in context
            if (value.type === 'object' && value.properties) {
                Object.entries(value.properties).forEach(([nestedKey, nestedValue]: [string, any]) => {
                    paths.push({
                        path: `${key}.${nestedKey}`,
                        fullPath: `${fullPath}.${nestedKey}`,
                        type: (nestedValue as any).type || 'unknown',
                        description: (nestedValue as any).description,
                        isArray: (nestedValue as any).type === 'array',
                        isContextual: true
                    })
                })
            }

            // Handle arrays in context
            if (value.type === 'array' && value.items?.properties) {
                Object.entries(value.items.properties).forEach(([itemKey, itemValue]: [string, any]) => {
                    paths.push({
                        path: `${key}[0].${itemKey}`,
                        fullPath: `${fullPath}[0].${itemKey}`,
                        type: (itemValue as any).type || 'unknown',
                        description: (itemValue as any).description,
                        isArray: (itemValue as any).type === 'array',
                        isContextual: true
                    })
                })
            }
        })
    }

    return paths
}

/**
 * Generate all possible paths from schema (global context)
 */
export function generateGlobalPaths(schema: any, prefix = ""): ContextualPath[] {
    const paths: ContextualPath[] = []

    if (!schema || typeof schema !== "object") return paths

    if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
            const currentPath = prefix ? `${prefix}.${key}` : key

            paths.push({
                path: currentPath,
                fullPath: currentPath,
                type: value.type || "unknown",
                description: value.description,
                isArray: value.type === "array",
                isContextual: false
            })

            // Recursively parse nested objects
            if (value.type === "object" && value.properties) {
                paths.push(...generateGlobalPaths(value, currentPath))
            }

            // Handle arrays
            if (value.type === "array" && value.items) {
                if (value.items.type === "object" && value.items.properties) {
                    paths.push(...generateGlobalPaths(value.items, `${currentPath}[0]`))
                } else {
                    paths.push({
                        path: `${currentPath}[0]`,
                        fullPath: `${currentPath}[0]`,
                        type: value.items.type || "unknown",
                        description: `Array item of ${value.items.type || "unknown"}`,
                        isArray: false,
                        isContextual: false
                    })
                }
            }
        })
    }

    return paths
}

/**
 * Clean search term from Mustache prefixes
 */
export function cleanSearchTerm(term: string): string {
    return term.replace(/^[#^/]\s*/, '').trim()
}

/**
 * Check if a path represents an array that can be used for sections
 */
export function isArrayPath(path: ContextualPath): boolean {
    return path.isArray === true && !path.path.includes('[0]')
}

/**
 * Generate section syntax for array paths
 */
export function generateSectionSyntax(path: string): string {
    return `#${path}}}...{{/${path}`
}
