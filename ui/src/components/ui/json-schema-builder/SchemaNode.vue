<script setup lang="ts">
import { computed } from 'vue'
import type { SchemaBuilderNode, JsonSchemaType } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
    ChevronRight,
    ChevronDown,
    Plus,
    Trash2,
    GripVertical,
    Type,
    Hash,
    ToggleLeft,
    Braces,
    Brackets,
    Eye,
    EyeOff
} from 'lucide-vue-next'

interface Props {
    node: SchemaBuilderNode
    canDelete?: boolean
    isDragging?: boolean
}

interface Emits {
    (e: 'update', id: string, updates: Partial<SchemaBuilderNode>): void
    (e: 'delete', id: string): void
    (e: 'add-child', parentId: string, type: JsonSchemaType): void
    (e: 'toggle-expanded', id: string): void
    (e: 'drag-start', node: SchemaBuilderNode): void
    (e: 'drag-end'): void
}

const props = withDefaults(defineProps<Props>(), {
    canDelete: true,
    isDragging: false
})

const emit = defineEmits<Emits>()

const typeOptions: { value: JsonSchemaType; label: string; icon: any }[] = [
    { value: 'string', label: 'String', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'boolean', label: 'Boolean', icon: ToggleLeft },
    { value: 'object', label: 'Object', icon: Braces },
    { value: 'array', label: 'Array', icon: Brackets }
]

const typeIcon = computed(() => {
    return typeOptions.find(opt => opt.value === props.node.type)?.icon || Type
})

const indentStyle = computed(() => ({
    paddingLeft: `${props.node.level * 24}px`
}))

const canExpand = computed(() => {
    return props.node.type === 'object' || props.node.type === 'array'
})

const enumValues = computed(() => {
    return props.node.enumValues || []
})

function updateNode(updates: Partial<SchemaBuilderNode>) {
    emit('update', props.node.id, updates)
}

function handleTypeChange(newType: JsonSchemaType) {
    const updates: Partial<SchemaBuilderNode> = { type: newType }

    // Reset type-specific properties
    if (newType === 'object') {
        updates.children = []
        updates.items = undefined
    } else if (newType === 'array') {
        updates.children = undefined
        updates.items = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'items',
            type: 'string',
            required: false,
            expanded: true,
            showDetails: false,
            level: props.node.level + 1,
            parentId: props.node.id
        }
    } else {
        updates.children = undefined
        updates.items = undefined
    }

    updateNode(updates)
}

function addChild(type: JsonSchemaType = 'string') {
    emit('add-child', props.node.id, type)
}

function toggleExpanded() {
    emit('toggle-expanded', props.node.id)
}

function handleDragStart(event: DragEvent) {
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', props.node.id)
    }
    emit('drag-start', props.node)
}

function handleDragEnd() {
    emit('drag-end')
}

function addEnumValue() {
    const currentValues = enumValues.value
    const newValues = [...currentValues, { value: '', description: undefined }]
    updateNode({ enumValues: newValues })
}

function updateEnumValue(index: number, field: 'value' | 'description', value: string) {
    const currentValues = enumValues.value
    const newValues = [...currentValues]
    if (newValues[index]) {
        newValues[index] = { ...newValues[index], [field]: value || undefined }
        updateNode({ enumValues: newValues })
    }
}

function removeEnumValue(index: number) {
    const currentValues = enumValues.value
    const newValues = currentValues.filter((_, i) => i !== index)
    updateNode({ enumValues: newValues })
}
</script>

<template>
    <div :class="cn(
        'group border-l-2 border-transparent hover:border-blue-200 transition-colors',
        isDragging && 'opacity-50'
    )" :style="indentStyle" draggable="true" @dragstart="handleDragStart" @dragend="handleDragEnd">
        <div class="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md">
            <!-- Drag Handle -->
            <GripVertical
                class="w-4 h-4 text-gray-400 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

            <!-- Expand/Collapse Button -->
            <Button v-if="canExpand" variant="ghost" size="icon" class="w-6 h-6 p-0" @click="toggleExpanded">
                <ChevronRight v-if="!node.expanded" class="w-4 h-4" />
                <ChevronDown v-else class="w-4 h-4" />
            </Button>
            <div v-else class="w-6" />

            <!-- Type Icon -->
            <component :is="typeIcon" class="w-4 h-4 text-gray-600" />

            <!-- Property Name -->
            <Input v-if="node.name !== 'items'" :model-value="node.name"
                @update:model-value="(value) => updateNode({ name: String(value) })" placeholder="Property name"
                class="h-8 min-w-32 max-w-48" />

            <!-- Array Item Schema Label -->
            <div v-else
                class="h-8 min-w-32 max-w-48 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-md">
                <span class="text-sm text-gray-600 font-medium">Array Item Schema</span>
            </div>

            <!-- Type Selector -->
            <Select :model-value="node.type" @update:model-value="(value) => handleTypeChange(value as JsonSchemaType)">
                <SelectTrigger class="w-32 h-8">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem v-for="option in typeOptions" :key="option.value" :value="option.value">
                        <div class="flex items-center gap-2">
                            <component :is="option.icon" class="w-4 h-4" />
                            {{ option.label }}
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>

            <!-- Required Checkbox (not shown for items as they are schema definitions) -->
            <div v-if="node.name !== 'items'" class="flex items-center gap-2">
                <Checkbox :model-value="node.required"
                    @update:model-value="(checked: boolean | 'indeterminate') => updateNode({ required: checked === true })" />
                <label class="text-sm text-gray-600">Required</label>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <!-- Details Toggle Button -->
                <Button variant="ghost" size="icon" class="w-8 h-8"
                    @click="updateNode({ showDetails: !node.showDetails })"
                    :title="node.showDetails ? 'Hide Details' : 'Show Details'">
                    <Eye v-if="!node.showDetails" class="w-4 h-4" />
                    <EyeOff v-else class="w-4 h-4" />
                </Button>

                <!-- Add Child Button (for objects and array items that are objects) -->
                <Button v-if="node.type === 'object'" variant="ghost" size="icon" class="w-8 h-8" @click="addChild()">
                    <Plus class="w-4 h-4" />
                </Button>

                <!-- Delete Button -->
                <Button v-if="canDelete" variant="ghost" size="icon" class="w-8 h-8 text-red-600 hover:text-red-700"
                    @click="emit('delete', node.id)">
                    <Trash2 class="w-4 h-4" />
                </Button>
            </div>
        </div>

        <!-- Advanced Properties -->
        <div v-if="node.expanded && node.showDetails" class="ml-8 mt-2 space-y-2">
            <!-- Description -->
            <div class="flex items-start gap-2">
                <label class="text-sm text-gray-600 min-w-20 mt-2">Description:</label>
                <Textarea :model-value="node.description || ''"
                    @update:model-value="(value) => updateNode({ description: String(value) })"
                    placeholder="Property description" class="min-h-16 resize-none" />
            </div>

            <!-- Type-specific properties -->
            <template v-if="node.type === 'string'">
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex items-center gap-2">
                        <label class="text-sm text-gray-600 min-w-20">Min Length:</label>
                        <Input type="number" :model-value="node.minLength"
                            @update:model-value="(value) => updateNode({ minLength: value ? Number(value) : undefined })"
                            class="h-8" />
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-sm text-gray-600 min-w-20">Max Length:</label>
                        <Input type="number" :model-value="node.maxLength"
                            @update:model-value="(value) => updateNode({ maxLength: value ? Number(value) : undefined })"
                            class="h-8" />
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm text-gray-600 min-w-20">Pattern:</label>
                    <Input :model-value="node.pattern || ''"
                        @update:model-value="(value) => updateNode({ pattern: String(value) })"
                        placeholder="Regular expression pattern" class="h-8" />
                </div>

                <!-- Enum Values -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="text-sm text-gray-600">Enum Values:</label>
                        <Button variant="outline" size="sm" @click="addEnumValue" class="h-7 px-2">
                            <Plus class="w-3 h-3 mr-1" />
                            Add
                        </Button>
                    </div>
                    <div v-if="enumValues.length === 0" class="text-sm text-gray-500 italic">
                        No enum values defined
                    </div>
                    <div v-else class="space-y-2 max-h-40 overflow-y-auto">
                        <div v-for="(enumValue, index) in enumValues" :key="index"
                            class="flex items-center gap-2 p-2 border border-gray-200 rounded-md">
                            <Input :model-value="enumValue.value"
                                @update:model-value="(value) => updateEnumValue(index, 'value', String(value))"
                                placeholder="Enum value" class="h-7 flex-1" />
                            <Input :model-value="enumValue.description || ''"
                                @update:model-value="(value) => updateEnumValue(index, 'description', String(value))"
                                placeholder="Description (optional)" class="h-7 flex-1" />
                            <Button variant="ghost" size="sm" @click="removeEnumValue(index)"
                                class="h-7 w-7 p-0 text-red-600 hover:text-red-700">
                                <Trash2 class="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            </template>

            <template v-if="node.type === 'number'">
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex items-center gap-2">
                        <label class="text-sm text-gray-600 min-w-20">Minimum:</label>
                        <Input type="number" :model-value="node.minimum"
                            @update:model-value="(value) => updateNode({ minimum: value ? Number(value) : undefined })"
                            class="h-8" />
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="text-sm text-gray-600 min-w-20">Maximum:</label>
                        <Input type="number" :model-value="node.maximum"
                            @update:model-value="(value) => updateNode({ maximum: value ? Number(value) : undefined })"
                            class="h-8" />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
