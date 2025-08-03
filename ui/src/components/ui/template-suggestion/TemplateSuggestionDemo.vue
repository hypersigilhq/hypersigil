<script setup lang="ts">
import { ref } from 'vue'
import { TemplateSuggestion } from './index'

const templateText = ref('Hello {{user.name}}, your email is {{user.email}}.')

const demoSchema = {
    type: 'object',
    properties: {
        user: {
            type: 'object',
            description: 'User information',
            properties: {
                name: {
                    type: 'string',
                    description: "User's full name",
                },
                email: {
                    type: 'string',
                    description: "User's email address",
                },
                age: {
                    type: 'number',
                    description: "User's age",
                },
                profile: {
                    type: 'object',
                    description: 'User profile details',
                    properties: {
                        bio: {
                            type: 'string',
                            description: "User's biography",
                        },
                        avatar: {
                            type: 'string',
                            description: 'Avatar image URL',
                        },
                        preferences: {
                            type: 'object',
                            properties: {
                                theme: {
                                    type: 'string',
                                    description: 'UI theme preference',
                                },
                                notifications: {
                                    type: 'boolean',
                                    description: 'Notification settings',
                                },
                            },
                        },
                    },
                },
            },
        },
        orders: {
            type: 'array',
            description: "User's orders",
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Order ID',
                    },
                    total: {
                        type: 'number',
                        description: 'Order total amount',
                    },
                    status: {
                        type: 'string',
                        description: 'Order status',
                    },
                    items: {
                        type: 'array',
                        description: 'Order items',
                        items: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Product name',
                                },
                                price: {
                                    type: 'number',
                                    description: 'Product price',
                                },
                                quantity: {
                                    type: 'number',
                                    description: 'Item quantity',
                                },
                            },
                        },
                    },
                },
            },
        },
        company: {
            type: 'object',
            description: 'Company information',
            properties: {
                name: {
                    type: 'string',
                    description: 'Company name',
                },
                address: {
                    type: 'object',
                    properties: {
                        street: {
                            type: 'string',
                            description: 'Street address',
                        },
                        city: {
                            type: 'string',
                            description: 'City',
                        },
                        country: {
                            type: 'string',
                            description: 'Country',
                        },
                    },
                },
            },
        },
    },
}
</script>

<template>
    <div class="container mx-auto p-6 max-w-6xl">
        <div class="space-y-6">
            <div>
                <h1 class="text-3xl font-bold">Template Suggestion Component Demo</h1>
                <p class="text-muted-foreground mt-2">
                    Type '&lcub;&lcub;' in the textarea below to see template suggestions
                    based on the
                    JSON schema.
                </p>
            </div>

            <TemplateSuggestion v-model="templateText" :schema="demoSchema"
                placeholder="Type your template here. Use {{ }} for variables..." />

            <div class="mt-6 p-4 bg-muted rounded-lg">
                <h3 class="text-lg font-semibold mb-2">Current Template Value:</h3>
                <pre class="text-sm bg-background p-3 rounded border">{{ templateText }}</pre>
            </div>

            <div class="mt-6 p-4 bg-muted rounded-lg">
                <h3 class="text-lg font-semibold mb-2">Instructions:</h3>
                <ul class="text-sm space-y-1 list-disc list-inside">
                    <li>Type '&lcub;&lcub;' anywhere in the textarea to trigger suggestions
                    </li>
                    <li>Start typing to filter suggestions</li>
                    <li>Click on a suggestion to insert it</li>
                    <li>Press Escape to close suggestions</li>
                    <li>Supports nested objects and arrays (e.g.,
                        '&lcub;&lcub;user.profile.preferences.theme&rcub;&rcub;')</li>
                </ul>
            </div>
        </div>
    </div>
</template>
