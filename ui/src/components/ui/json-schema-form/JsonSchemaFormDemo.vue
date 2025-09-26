<template>
    <div class="space-y-6 p-6">
        <div class="text-center space-y-2">
            <h1 class="text-3xl font-bold">JSON Schema Form Generator</h1>
            <p class="text-gray-600 max-w-2xl mx-auto">
                Generate forms automatically from JSON schemas. Supports all JSON Schema types,
                validation rules, and nested structures.
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

                    <Button variant="outline" size="sm" @click="clearForm">
                        Clear
                    </Button>

                    <div class="flex items-center gap-2">
                        <input id="readonly" v-model="readonly" type="checkbox" class="rounded">
                        <label for="readonly" class="text-sm">Read-only mode</label>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Form Output -->
        <Card>
            <CardHeader>
                <CardTitle class="text-lg">Generated Form</CardTitle>
            </CardHeader>
            <CardContent>
                <JsonSchemaForm v-if="schema" :schema="schema" v-model="formData" :readonly="readonly"
                    @submit="handleSubmit" @error="handleError" />
                <div v-else class="text-center py-8 text-gray-500">
                    Select an example schema above to see the generated form
                </div>
            </CardContent>
        </Card>

        <!-- Form Data Output -->
        <Card>
            <CardHeader>
                <CardTitle class="text-lg">Form Data (Real-time)</CardTitle>
            </CardHeader>
            <CardContent>
                <pre
                    class="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-64">{{ JSON.stringify(formData, null, 2) }}</pre>
            </CardContent>
        </Card>

        <!-- Validation Errors -->
        <Card v-if="errors && Object.keys(errors).length > 0">
            <CardHeader>
                <CardTitle class="text-lg text-red-600">Validation Errors</CardTitle>
            </CardHeader>
            <CardContent>
                <ul class="list-disc list-inside space-y-1">
                    <li v-for="(error, field) in errors" :key="field" class="text-red-600">
                        <strong>{{ field }}:</strong> {{ error }}
                    </li>
                </ul>
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
                        <Badge variant="secondary">Auto Generation</Badge>
                        <p class="text-sm text-gray-600">
                            Forms are generated automatically from JSON schemas
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Type Support</Badge>
                        <p class="text-sm text-gray-600">
                            Supports string, number, boolean, object, and array types
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Validation</Badge>
                        <p class="text-sm text-gray-600">
                            Built-in validation with real-time error feedback
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Nested Structures</Badge>
                        <p class="text-sm text-gray-600">
                            Handles complex nested objects and arrays
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Enum Support</Badge>
                        <p class="text-sm text-gray-600">
                            Dropdown selects for enumerated values
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Badge variant="secondary">Reactive</Badge>
                        <p class="text-sm text-gray-600">
                            Two-way data binding with v-model support
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import JsonSchemaForm from './JsonSchemaForm.vue'
import type { FormData, FormErrors } from './types'

const schema = ref<Record<string, unknown> | null>(null)
const formData = ref<FormData>({})
const errors = ref<FormErrors>({})
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
                role: {
                    type: 'string',
                    enum: ['admin', 'user', 'moderator'],
                    description: 'User role in the system'
                }
            },
            required: ['name', 'email']
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
                            required: ['width', 'height', 'depth']
                        }
                    }
                }
            },
            required: ['id', 'title', 'price']
        }
    }
]

function loadExample(exampleSchema: Record<string, unknown>) {
    schema.value = exampleSchema
    formData.value = {}
    errors.value = {}
}

function clearForm() {
    schema.value = null
    formData.value = {}
    errors.value = {}
}

function handleSubmit(data: FormData) {
    console.log('Form submitted:', data)
    alert('Form submitted successfully! Check console for data.')
}

function handleError(newErrors: FormErrors) {
    errors.value = newErrors
}
</script>
