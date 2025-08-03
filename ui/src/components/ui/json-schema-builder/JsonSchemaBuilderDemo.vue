<script setup lang="ts">
import { ref } from 'vue'
import { JsonSchemaBuilder } from './index'
import type { JsonSchema } from './types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const schema = ref<JsonSchema>()
const readonly = ref(false)

// Example schemas for quick testing
const exampleSchemas = [
    {
        name: 'User Profile',
        schema: {
            type: 'object' as const,
            properties: {
                name: {
                    type: 'string',
                    description: 'Full name of the user',
                    minLength: 1,
                    maxLength: 100
                },
                email: {
                    type: 'string',
                    description: 'Email address',
                    pattern: '^[^@]+@[^@]+\\.[^@]+$'
                },
                age: {
                    type: 'number',
                    description: 'Age in years',
                    minimum: 0,
                    maximum: 150
                },
                isActive: {
                    type: 'boolean',
                    description: 'Whether the user account is active'
                },
                preferences: {
                    type: 'object',
                    properties: {
                        theme: {
                            type: 'string',
                            enum: ['light', 'dark', 'auto']
                        },
                        notifications: {
                            type: 'boolean'
                        }
                    },
                    required: ['theme'],
                    additionalProperties: false
                },
                tags: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'User tags'
                }
            },
            required: ['name', 'email'],
            additionalProperties: false
        }
    },
    {
        name: 'Product Catalog',
        schema: {
            type: 'object' as const,
            properties: {
                id: {
                    type: 'string',
                    description: 'Unique product identifier'
                },
                title: {
                    type: 'string',
                    description: 'Product title',
                    minLength: 1,
                    maxLength: 200
                },
                price: {
                    type: 'number',
                    description: 'Price in USD',
                    minimum: 0
                },
                categories: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    description: 'Product categories'
                },
                specifications: {
                    type: 'object',
                    properties: {
                        weight: {
                            type: 'number',
                            description: 'Weight in grams'
                        },
                        dimensions: {
                            type: 'object',
                            properties: {
                                width: { type: 'number' },
                                height: { type: 'number' },
                                depth: { type: 'number' }
                            },
                            required: ['width', 'height', 'depth'],
                            additionalProperties: false
                        }
                    },
                    additionalProperties: false
                }
            },
            required: ['id', 'title', 'price'],
            additionalProperties: false
        }
    }
]

function loadExample(exampleSchema: JsonSchema) {
    schema.value = exampleSchema
}

function clearSchema() {
    schema.value = undefined
}

function handleSchemaChange(newSchema: JsonSchema) {
    console.log('Schema updated:', newSchema)
}
</script>

<template>
    <div class="space-y-6 p-6">
        <div class="text-center space-y-2">
            <h1 class="text-3xl font-bold">JSON Schema Builder</h1>
            <p class="text-gray-600 max-w-2xl mx-auto">
                A visual tool for building JSON schemas with support for nested objects, arrays,
                and all standard JSON Schema features. Create complex data structures with an intuitive drag-and-drop
                interface.
            </p>
        </div>

        <!-- Demo Controls -->
        <Card>
            <CardHeader>
                <CardTitle class="text-lg">Demo Controls</CardTitle>
            </CardHeader>
            <CardContent>
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium">Load Example:</span>
                        <Button v-for="example in exampleSchemas" :key="example.name" variant="outline" size="sm"
                            @click="loadExample(example.schema)">
                            {{ example.name }}
                        </Button>
                    </div>

                    <Separator orientation="vertical" class="h-6" />

                    <Button variant="outline" size="sm" @click="clearSchema">
                        Clear
                    </Button>

                    <div class="flex items-center gap-2">
                        <input id="readonly" v-model="readonly" type="checkbox" class="rounded">
                        <label for="readonly" class="text-sm">Read-only mode</label>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Features Overview -->
        <Card>
            <CardHeader>
                <CardTitle class="text-lg">Features</CardTitle>
            </CardHeader>
            <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="space-y-2">
                        <Badge variant="secondary">Visual Tree Structure</Badge>
                        <p class="text-sm text-gray-600">
                            Hierarchical view of your schema with expandable/collapsible nodes
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">All JSON Types</Badge>
                        <p class="text-sm text-gray-600">
                            Support for string, number, boolean, object, and array types
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Nested Structures</Badge>
                        <p class="text-sm text-gray-600">
                            Create complex nested objects and arrays with unlimited depth
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Drag & Drop</Badge>
                        <p class="text-sm text-gray-600">
                            Reorder properties with intuitive drag-and-drop functionality
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Live Output</Badge>
                        <p class="text-sm text-gray-600">
                            Real-time JSON schema generation as you build
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Import/Export</Badge>
                        <p class="text-sm text-gray-600">
                            Load existing schemas or export your creations
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Schema Builder -->
        <JsonSchemaBuilder v-model="schema" :readonly="readonly" @update:model-value="handleSchemaChange" />

        <!-- Usage Instructions -->
        <Card>
            <CardHeader>
                <CardTitle class="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-3">
                        <h4 class="font-semibold">Building Schemas</h4>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li>• Click "Add Property" to add root-level properties</li>
                            <li>• Use the "+" button on objects to add child properties</li>
                            <li>• Change property types using the dropdown selector</li>
                            <li>• Mark properties as required using the checkbox</li>
                            <li>• Expand properties to set descriptions and constraints</li>
                        </ul>
                    </div>

                    <div class="space-y-3">
                        <h4 class="font-semibold">Advanced Features</h4>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li>• Drag properties to reorder them</li>
                            <li>• Set string patterns, min/max length</li>
                            <li>• Configure number ranges</li>
                            <li>• Create arrays of objects or primitives</li>
                            <li>• Export schemas as JSON files</li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</template>
