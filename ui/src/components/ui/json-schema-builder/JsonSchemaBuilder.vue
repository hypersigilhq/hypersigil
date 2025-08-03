<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SchemaBuilderNode, JsonSchema, JsonSchemaType } from './types'
import {
    createNode,
    convertToJsonSchema,
    convertJsonSchemaToNodes,
    updateNodeById,
    removeNodeById,
    flattenNodes,
    generateId,
    findNodeById
} from './utils'
import SchemaNode from './SchemaNode.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Plus, Download, Upload, Eye, EyeOff } from 'lucide-vue-next'

interface Props {
    modelValue?: JsonSchema
    readonly?: boolean
}

interface Emits {
    (e: 'update:modelValue', value: JsonSchema): void
}

const props = withDefaults(defineProps<Props>(), {
    readonly: false
})

const emit = defineEmits<Emits>()

// State
const nodes = ref<SchemaBuilderNode[]>([])
const draggedNode = ref<SchemaBuilderNode | null>(null)
const showJsonOutput = ref(true)

// Computed
const jsonSchema = computed(() => {
    return convertToJsonSchema(nodes.value)
})

const flatNodes = computed(() => {
    return flattenNodes(nodes.value)
})

const nodeCount = computed(() => {
    return flatNodes.value.length
})

// Store the last emitted schema to prevent circular updates
const lastEmittedSchema = ref<string>('')

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
    if (newValue) {
        const newValueStr = JSON.stringify(newValue)
        if (newValueStr !== lastEmittedSchema.value) {
            // Convert JSON schema back to nodes
            nodes.value = convertJsonSchemaToNodes(newValue)
        }
    }
}, { immediate: true })

// Watch for internal changes
watch(jsonSchema, (newValue) => {
    const newValueStr = JSON.stringify(newValue)
    if (newValueStr !== lastEmittedSchema.value) {
        lastEmittedSchema.value = newValueStr
        emit('update:modelValue', newValue)
    }
}, { deep: true })

// Initialize with empty root properties if no model value
if (nodes.value.length === 0 && !props.modelValue) {
    nodes.value = []
}

// Methods
function addRootProperty(type: JsonSchemaType = 'string') {
    const newNode = createNode(`property${nodes.value.length + 1}`, type, 0)
    nodes.value.push(newNode)
}

function addChildProperty(parentId: string, type: JsonSchemaType = 'string') {
    const parentNode = findNodeInTree(nodes.value, parentId)
    if (!parentNode) return

    // Handle adding properties to any object (including nested array items)
    if (parentNode.type === 'object') {
        if (!parentNode.children) {
            parentNode.children = []
        }

        const newNode = createNode(
            `property${Date.now()}`,
            type,
            parentNode.level + 1,
            parentId
        )
        parentNode.children.push(newNode)
    }
}

function updateNode(id: string, updates: Partial<SchemaBuilderNode>) {
    nodes.value = updateNodeById(nodes.value, id, updates)
}

function deleteNode(id: string) {
    nodes.value = removeNodeById(nodes.value, id)
}

function toggleExpanded(id: string) {
    updateNode(id, { expanded: !findNodeInTree(nodes.value, id)?.expanded })
}

function findNodeInTree(nodeList: SchemaBuilderNode[], id: string): SchemaBuilderNode | null {
    // Use the improved utility function that handles nested arrays
    return findNodeById(nodeList, id)
}

function handleDragStart(node: SchemaBuilderNode) {
    draggedNode.value = node
}

function handleDragEnd() {
    draggedNode.value = null
}

function handleDragOver(event: DragEvent) {
    event.preventDefault()
}

function handleDrop(event: DragEvent, targetNode?: SchemaBuilderNode) {
    event.preventDefault()
    if (!draggedNode.value || !targetNode) return

    // Simple drag and drop logic - would need more sophisticated implementation
    console.log('Drop:', draggedNode.value.name, 'onto', targetNode.name)
}

function exportSchema() {
    const schema = jsonSchema.value
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schema.json'
    a.click()
    URL.revokeObjectURL(url)
}

function importSchema() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const schema = JSON.parse(e.target?.result as string)
                // Convert schema to nodes
                nodes.value = convertJsonSchemaToNodes(schema)
            } catch (error) {
                console.error('Invalid JSON schema:', error)
            }
        }
        reader.readAsText(file)
    }
    input.click()
}

function collapseAll() {
    function collapse(nodeList: SchemaBuilderNode[]) {
        for (const node of nodeList) {
            updateNode(node.id, { expanded: false })
            if (node.children) collapse(node.children)
        }
    }
    collapse(nodes.value)
}

function expandAll() {
    function expand(nodeList: SchemaBuilderNode[]) {
        for (const node of nodeList) {
            updateNode(node.id, { expanded: true })
            if (node.children) expand(node.children)
        }
    }
    expand(nodes.value)
}
</script>

<template>
    <div class="json-schema-builder w-full">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Schema Builder Panel -->
            <Card class="h-fit">
                <CardHeader class="pb-4">
                    <div class="flex items-center justify-between">
                        <CardTitle class="text-lg">Schema Builder</CardTitle>
                        <div class="flex items-center gap-2">
                            <Badge variant="secondary">{{ nodeCount }} properties</Badge>
                            <div class="flex items-center gap-1">
                                <Button variant="ghost" size="sm" @click="collapseAll" title="Collapse All">
                                    <EyeOff class="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" @click="expandAll" title="Expand All">
                                    <Eye class="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <Button size="sm" @click="addRootProperty('string')" :disabled="readonly">
                            <Plus class="w-4 h-4 mr-2" />
                            Add Property
                        </Button>

                        <Separator orientation="vertical" class="h-6" />

                        <Button variant="outline" size="sm" @click="importSchema" :disabled="readonly">
                            <Upload class="w-4 h-4 mr-2" />
                            Import
                        </Button>

                        <Button variant="outline" size="sm" @click="exportSchema">
                            <Download class="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </CardHeader>

                <CardContent class="pt-0">
                    <div class="space-y-1 max-h-96 overflow-y-auto" @dragover="handleDragOver">
                        <template v-for="node in flatNodes" :key="node.id">
                            <SchemaNode :node="node" :can-delete="flatNodes.length > 1"
                                :is-dragging="draggedNode?.id === node.id" @update="updateNode" @delete="deleteNode"
                                @add-child="addChildProperty" @toggle-expanded="toggleExpanded"
                                @drag-start="handleDragStart" @drag-end="handleDragEnd" />
                        </template>
                    </div>
                </CardContent>
            </Card>

            <!-- JSON Output Panel -->
            <Card class="h-fit">
                <CardHeader class="pb-4">
                    <div class="flex items-center justify-between">
                        <CardTitle class="text-lg">JSON Schema Output</CardTitle>
                        <Button variant="ghost" size="sm" @click="showJsonOutput = !showJsonOutput">
                            <component :is="showJsonOutput ? EyeOff : Eye" class="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent v-if="showJsonOutput" class="pt-0">
                    <pre class="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto max-h-96 overflow-y-auto border">{{
                        JSON.stringify(jsonSchema, null, 2) }}</pre>
                </CardContent>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.json-schema-builder {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

pre {
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}
</style>
