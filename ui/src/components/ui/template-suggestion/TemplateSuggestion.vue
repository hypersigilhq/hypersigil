<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { parseJsonSchema, type SchemaPath } from './schema-parser'
import { cn } from '@/lib/utils'

interface Props {
    schema?: any
    placeholder?: string
    modelValue?: string
    class?: string
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

// Template refs
const textareaRef = ref<HTMLTextAreaElement>()
const dropdownRef = ref<HTMLDivElement>()

// Computed properties
const allPaths = computed(() => parseJsonSchema(props.schema))

const filteredSuggestions = computed(() => {
    if (!searchTerm.value) return allPaths.value

    return allPaths.value.filter(
        (path) =>
            path.path.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
            path.description?.toLowerCase().includes(searchTerm.value.toLowerCase())
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


const handleTextChange = (event: Event) => {
    const target = event.target as HTMLTextAreaElement
    const newText = target.value
    const cursorPos = target.selectionStart || 0

    text.value = newText
    cursorPosition.value = cursorPos

    // Check if we should show suggestions
    const textBeforeCursor = newText.slice(0, cursorPos)
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{')
    const lastCloseBrace = textBeforeCursor.lastIndexOf('}}')

    if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
        const searchText = textBeforeCursor.slice(lastOpenBrace + 2).trim()
        searchTerm.value = searchText
        showSuggestions.value = true
    } else {
        showSuggestions.value = false
        searchTerm.value = ''
    }
}

const insertSuggestion = (suggestion: SchemaPath) => {
    if (!textareaRef.value) return

    const textBeforeCursor = text.value.slice(0, cursorPosition.value)
    const textAfterCursor = text.value.slice(cursorPosition.value)
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{')

    if (lastOpenBrace !== -1) {
        const beforeBrace = text.value.slice(0, lastOpenBrace)
        const newText = `${beforeBrace}{{${suggestion.path}}}${textAfterCursor}`
        const newCursorPos = lastOpenBrace + suggestion.path.length + 4

        text.value = newText
        showSuggestions.value = false

        // Set cursor position after insertion
        nextTick(() => {
            if (textareaRef.value) {
                textareaRef.value.focus()
                textareaRef.value.setSelectionRange(newCursorPos, newCursorPos)
            }
        })
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
    <div :class="cn('w-full space-y-4', props.class)">
        <div class="relative">
            <Textarea ref="textareaRef" v-model="text" :placeholder="placeholder" class="min-h-[200px] font-mono"
                @input="handleTextChange" @keydown="handleKeyDown" />

            <!-- Suggestions Dropdown -->
            <div v-if="showSuggestions && filteredSuggestions.length > 0" ref="dropdownRef"
                class="absolute z-50 w-80 rounded-md border bg-popover p-0 text-popover-foreground shadow-md"
                style="top: 100%; left: 0;">
                <div class="p-2">
                    <div class="text-sm font-medium text-muted-foreground mb-2">Available Variables</div>
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
                            <Badge variant="secondary" :class="cn('text-xs', getTypeColor(suggestion.type))">
                                {{ suggestion.type }}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Preview of available variables -->
        <Card class="p-4">
            <div class="space-y-3">
                <div>
                    <h3 class="text-sm font-medium">Available Variables</h3>
                    <p class="text-xs text-muted-foreground">All variables available from your schema</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <div v-for="(path, index) in allPaths.slice(0, 12)" :key="`${path.path}-${index}`"
                        class="flex items-center gap-2 p-2 rounded border bg-muted/50">
                        <code class="text-sm flex-1 truncate">{{ `&lcub;&lcub;${path.path}&rcub;&rcub;` }}</code>
                        <Badge variant="secondary" :class="cn('text-xs', getTypeColor(path.type))">
                            {{ path.type }}
                        </Badge>
                    </div>
                    <div v-if="allPaths.length > 12" class="text-sm text-muted-foreground p-2">
                        +{{ allPaths.length - 12 }} more variables...
                    </div>
                </div>
            </div>
        </Card>
    </div>
</template>
