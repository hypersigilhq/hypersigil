<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { parseJsonSchema, type SchemaPath } from './schema-parser'
import {
    getCurrentContext,
    generateContextualPaths,
    generateGlobalPaths,
    cleanSearchTerm,
    isArrayPath,
    generateSectionSyntax,
    type ContextualPath
} from './mustache-parser'
import { cn } from '@/lib/utils'

interface CursorPosition {
    x: number
    y: number
}

interface Props {
    schema?: any
    placeholder?: string
    modelValue?: string
    class?: string
    showAvailableVars?: boolean
}

interface Emits {
    (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
    schema: () => { },
    placeholder: 'Type your template here. Use {{ }} for variables...',
    modelValue: '',
})

const emits = defineEmits<Emits>()

// Reactive state
const text = ref(props.modelValue)
const showSuggestions = ref(false)
const cursorPosition = ref(0)
const searchTerm = ref('')
const selectedSuggestionIndex = ref(0)
const dropdownPosition = ref<CursorPosition>({ x: 0, y: 0 })
const currentContext = ref<string[]>([])

// Template refs
const textareaRef = ref()
const dropdownRef = ref<HTMLDivElement>()
const mirrorRef = ref<HTMLDivElement>()

// Computed properties
const allPaths = computed(() => parseJsonSchema(props.schema))

// Generate contextual paths based on current Mustache context
const contextualPaths = computed(() => {
    if (!currentContext.value.length) return []
    return generateContextualPaths(props.schema, currentContext.value)
})

// Generate global paths for fallback
const globalPaths = computed(() => generateGlobalPaths(props.schema))

const filteredSuggestions = computed(() => {
    // Prioritize contextual paths if available, otherwise use global paths
    const basePaths = contextualPaths.value.length > 0 ? contextualPaths.value : globalPaths.value

    if (!searchTerm.value) return basePaths

    const cleanedSearchTerm = cleanSearchTerm(searchTerm.value)

    return basePaths.filter(
        (path) =>
            path.path.toLowerCase().includes(cleanedSearchTerm.toLowerCase()) ||
            path.description?.toLowerCase().includes(cleanedSearchTerm.toLowerCase())
    )
})

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
    text.value = newValue
})

// Watch for text changes and emit updates
watch(text, (newValue) => {
    emits('update:modelValue', newValue)
})

// Reset selected index when suggestions change
watch(filteredSuggestions, () => {
    selectedSuggestionIndex.value = 0
})

// Reset selected index when suggestions are shown/hidden
watch(showSuggestions, (isShown) => {
    if (isShown) {
        selectedSuggestionIndex.value = 0
    }
})

// Auto-scroll to selected suggestion
watch(selectedSuggestionIndex, () => {
    nextTick(() => {
        if (dropdownRef.value) {
            const selectedElement = dropdownRef.value.querySelector(`[data-suggestion-index="${selectedSuggestionIndex.value}"]`)
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' })
            }
        }
    })
})

// Methods
const getCursorPosition = (textarea: HTMLTextAreaElement, cursorIndex: number): CursorPosition => {
    if (!textarea || !textarea.value) return { x: 0, y: 0 }

    // Simple approach: calculate line and character position
    const textBeforeCursor = textarea.value.substring(0, cursorIndex)
    const lines = textBeforeCursor.split('\n')
    const currentLine = lines.length - 1
    const currentColumn = lines[lines.length - 1].length

    // Get computed styles for measurements
    const computedStyle = window.getComputedStyle(textarea)
    const fontSize = parseInt(computedStyle.fontSize) || 14
    const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.2
    const paddingLeft = parseInt(computedStyle.paddingLeft) || 0
    const paddingTop = parseInt(computedStyle.paddingTop) || 0

    // Estimate character width (rough approximation for monospace)
    const charWidth = fontSize * 0.6

    // Calculate approximate position
    let x = paddingLeft + (currentColumn * charWidth)
    let y = paddingTop + (currentLine * lineHeight) + lineHeight + 40

    // Smart positioning: ensure dropdown doesn't go off-screen
    const dropdownWidth = 320 // 80 * 4 (w-80 in Tailwind)
    const dropdownHeight = 240 // max-h-60 in pixels

    // Adjust horizontal position if dropdown would go off-screen
    if (x + dropdownWidth > textarea.clientWidth) {
        x = Math.max(0, textarea.clientWidth - dropdownWidth)
    }

    // Adjust vertical position if dropdown would go below textarea
    if (y + dropdownHeight > textarea.clientHeight) {
        // Position above cursor instead
        y = paddingTop + (currentLine * lineHeight) - dropdownHeight - 5
        // Ensure it doesn't go above textarea
        if (y < 0) {
            y = paddingTop + (currentLine * lineHeight) + lineHeight + 5
        }
    }

    return { x, y }
}

const getTypeColor = (type: string) => {
    switch (type) {
        case 'string':
            return 'bg-green-100 text-green-800'
        case 'number':
            return 'bg-blue-100 text-blue-800'
        case 'boolean':
            return 'bg-purple-100 text-purple-800'
        case 'array':
            return 'bg-orange-100 text-orange-800'
        case 'object':
            return 'bg-gray-100 text-gray-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}


const updateDropdownPosition = () => {
    if (textareaRef.value && showSuggestions.value) {
        // Get the actual DOM element from the Vue component
        const textareaElement = textareaRef.value.$el as HTMLTextAreaElement
        console.log('Textarea component:', textareaRef.value) // Debug log
        console.log('Textarea DOM element:', textareaElement) // Debug log

        if (textareaElement && textareaElement.selectionStart !== undefined) {
            const cursorPos = textareaElement.selectionStart || 0
            console.log('Cursor position:', cursorPos) // Debug log
            console.log('Textarea value:', textareaElement.value) // Debug log

            const position = getCursorPosition(textareaElement, cursorPos)
            console.log('Calculated position:', position) // Debug log
            dropdownPosition.value = position
        }
    }
}

const handleTextChange = (event: Event) => {
    const target = event.target as HTMLTextAreaElement
    const newText = target.value
    const cursorPos = target.selectionStart || 0

    text.value = newText
    cursorPosition.value = cursorPos

    // Update current context based on cursor position
    currentContext.value = getCurrentContext(newText, cursorPos)

    // Check if we should show suggestions
    const textBeforeCursor = newText.slice(0, cursorPos)
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{')
    const lastCloseBrace = textBeforeCursor.lastIndexOf('}}')

    if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
        const searchText = textBeforeCursor.slice(lastOpenBrace + 2).trim()
        searchTerm.value = cleanSearchTerm(searchText)
        showSuggestions.value = true

        // Calculate cursor position for dropdown positioning
        nextTick(() => {
            updateDropdownPosition()
        })
    } else {
        showSuggestions.value = false
        searchTerm.value = ''
    }
}

const handleCursorMove = () => {
    if (showSuggestions.value) {
        nextTick(() => {
            updateDropdownPosition()
        })
    }
}

const insertSuggestion = (suggestion: ContextualPath | SchemaPath) => {
    if (!textareaRef.value) return

    const textBeforeCursor = text.value.slice(0, cursorPosition.value)
    const textAfterCursor = text.value.slice(cursorPosition.value)
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{')

    if (lastOpenBrace !== -1) {
        const beforeBrace = text.value.slice(0, lastOpenBrace)

        // Check if this is an array path that should generate a section
        const contextualSuggestion = suggestion as ContextualPath
        if (isArrayPath(contextualSuggestion)) {
            // Insert section syntax for arrays
            const sectionSyntax = generateSectionSyntax(suggestion.path)
            const newText = `${beforeBrace}{{${sectionSyntax}}}${textAfterCursor}`
            const newCursorPos = lastOpenBrace + sectionSyntax.length - suggestion.path.length - 3 // Position cursor inside section

            text.value = newText
            showSuggestions.value = false

            nextTick(() => {
                if (textareaRef.value) {
                    const textarea = textareaRef.value as any
                    const element = textarea.$el || textarea
                    if (element && element.focus) {
                        element.focus()
                        element.setSelectionRange(newCursorPos, newCursorPos)
                    }
                }
            })
        } else {
            // Regular variable insertion
            const newText = `${beforeBrace}{{${suggestion.path}}}${textAfterCursor}`
            const newCursorPos = lastOpenBrace + suggestion.path.length + 4

            text.value = newText
            showSuggestions.value = false

            nextTick(() => {
                if (textareaRef.value) {
                    const textarea = textareaRef.value as any
                    const element = textarea.$el || textarea
                    if (element && element.focus) {
                        element.focus()
                        element.setSelectionRange(newCursorPos, newCursorPos)
                    }
                }
            })
        }
    }
}

const insertSelectedSuggestion = () => {
    if (filteredSuggestions.value[selectedSuggestionIndex.value]) {
        insertSuggestion(filteredSuggestions.value[selectedSuggestionIndex.value])
    }
}

const handleKeyDown = (event: KeyboardEvent) => {
    if (!showSuggestions.value || filteredSuggestions.value.length === 0) {
        return
    }

    switch (event.key) {
        case 'Escape':
            showSuggestions.value = false
            event.preventDefault()
            break
        case 'ArrowDown':
            selectedSuggestionIndex.value = Math.min(
                selectedSuggestionIndex.value + 1,
                filteredSuggestions.value.length - 1
            )
            event.preventDefault()
            break
        case 'ArrowUp':
            selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
            event.preventDefault()
            break
        case 'Enter':
        case 'Tab':
            insertSelectedSuggestion()
            event.preventDefault()
            break
    }
}
</script>

<template>
    <div :class="cn('w-full h-full flex flex-col gap-4', props.class)">
        <div class="relative flex-1 flex flex-col">
            <Textarea ref="textareaRef" v-model="text" :placeholder="placeholder" class="h-full font-mono resize-none"
                @input="handleTextChange" @keydown="handleKeyDown" @click="handleCursorMove"
                @keyup="handleCursorMove" />

            <!-- Hidden mirror element for cursor position calculation -->
            <div ref="mirrorRef"
                style="position: absolute; visibility: hidden; height: auto; z-index: -1; top: 0; left: 0; pointer-events: none; white-space: pre-wrap; word-wrap: break-word; overflow: hidden;">
            </div>

            <!-- Suggestions Dropdown -->
            <div v-if="showSuggestions && filteredSuggestions.length > 0" ref="dropdownRef"
                class="absolute z-50 w-80 rounded-md border bg-popover p-0 text-popover-foreground shadow-md" :style="{
                    left: dropdownPosition.x + 'px',
                    top: dropdownPosition.y + 'px'
                }">
                <div class="p-2">
                    <!-- Context indicator -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-sm font-medium text-muted-foreground">Available Variables</div>
                        <div v-if="currentContext.length > 0"
                            class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            Context: {{ currentContext.join('.') }}
                        </div>
                    </div>

                    <div class="max-h-60 overflow-y-auto">
                        <div v-for="(suggestion, index) in filteredSuggestions" :key="`${suggestion.path}-${index}`"
                            :data-suggestion-index="index" :class="cn(
                                'flex items-center justify-between gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm',
                                index === selectedSuggestionIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent hover:text-accent-foreground'
                            )" @click="insertSuggestion(suggestion)">
                            <div class="flex-1 min-w-0">
                                <div class="font-mono text-sm truncate">{{ suggestion.path }}</div>
                                <div v-if="suggestion.description" class="text-xs text-muted-foreground truncate">
                                    {{ suggestion.description }}
                                </div>
                            </div>
                            <div class="flex items-center gap-1">
                                <!-- Contextual badge -->
                                <Badge v-if="(suggestion as ContextualPath).isContextual" variant="outline"
                                    class="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    ctx
                                </Badge>
                                <!-- Loop badge for arrays -->
                                <Badge v-if="isArrayPath(suggestion as ContextualPath)" variant="outline"
                                    class="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                    loop
                                </Badge>
                                <!-- Type badge -->
                                <Badge variant="secondary" :class="cn('text-xs', getTypeColor(suggestion.type))">
                                    {{ suggestion.type }}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Preview of available variables -->
        <Card class="p-4" v-if="showAvailableVars">
            <div class="space-y-4">
                <!-- Current Context Display -->
                <div v-if="currentContext.length > 0" class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div class="flex items-center gap-2 mb-1">
                        <Badge variant="outline" class="text-xs bg-blue-100 text-blue-700 border-blue-300">
                            Current Context
                        </Badge>
                    </div>
                    <div class="text-sm font-mono text-blue-800">
                        {{ currentContext.join(' → ') }}
                    </div>
                    <div class="text-xs text-blue-600 mt-1">
                        You're inside {{ currentContext.length === 1 ? 'a' : 'nested' }}
                        {{ currentContext.length === 1 ? 'section' : 'sections' }}.
                        Variables shown are contextual to this scope.
                    </div>
                </div>

                <!-- Mustache Syntax Guide -->
                <div class="p-3 bg-gray-50 rounded-lg border">
                    <h4 class="text-sm font-medium mb-2">Mustache Syntax Guide</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div class="space-y-1">
                            <div><code class="bg-white px-1 rounded">`&lcub;&lcub;variable&rcub;$rcub;`</code> -
                                Variable</div>
                            <div><code
                                    class="bg-white px-1 rounded">`&lcub;&lcub;#array&rcub;$rcub;...&lcub;&lcub;/array&rcub;$rcub;`</code>
                                - Loop</div>
                        </div>
                        <div class="space-y-1">
                            <div><code
                                    class="bg-white px-1 rounded">`&lcub;&lcub;^empty&rcub;$rcub;...&lcub;&lcub;/empty&rcub;$rcub;`</code>
                                - If empty
                            </div>
                            <div><code
                                    class="bg-white px-1 rounded">`&lcub;&lcub;#obj.prop&rcub;$rcub;...&lcub;&lcub;/obj.prop&rcub;$rcub;`</code>
                                - Nested
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Available Variables -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-sm font-medium">Available Variables</h3>
                        <div class="flex items-center gap-1">
                            <Badge variant="outline" class="text-xs bg-blue-50 text-blue-700 border-blue-200">ctx
                            </Badge>
                            <span class="text-xs text-muted-foreground">contextual</span>
                            <Badge variant="outline"
                                class="text-xs bg-orange-50 text-orange-700 border-orange-200 ml-2">loop</Badge>
                            <span class="text-xs text-muted-foreground">array</span>
                        </div>
                    </div>
                    <p class="text-xs text-muted-foreground mb-3">
                        {{ currentContext.length > 0
                            ? 'Showing contextual variables for your current scope'
                            : 'All variables available from your schema' }}
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        <div v-for="(path, index) in (contextualPaths.length > 0 ? contextualPaths : globalPaths).slice(0, 12)"
                            :key="`${path.path}-${index}`"
                            class="flex items-center gap-2 p-2 rounded border bg-muted/50">
                            <code class="text-sm flex-1 truncate">{{ `&lcub;&lcub;${path.path}&rcub;$rcub;` }}</code>
                            <div class="flex items-center gap-1">
                                <Badge v-if="(path as ContextualPath).isContextual" variant="outline"
                                    class="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    ctx
                                </Badge>
                                <Badge v-if="isArrayPath(path as ContextualPath)" variant="outline"
                                    class="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                    loop
                                </Badge>
                                <Badge variant="secondary" :class="cn('text-xs', getTypeColor(path.type))">
                                    {{ path.type }}
                                </Badge>
                            </div>
                        </div>
                        <div v-if="(contextualPaths.length > 0 ? contextualPaths : globalPaths).length > 12"
                            class="text-sm text-muted-foreground p-2">
                            +{{ (contextualPaths.length > 0 ? contextualPaths : globalPaths).length - 12 }} more
                            variables...
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    </div>
</template>
