<template>
    <div class="container mx-auto p-6 space-y-8">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-3xl font-bold tracking-tight">Component Playground</h1>
                <p class="text-muted-foreground">
                    Development environment for testing UI components
                </p>
            </div>
            <Badge variant="secondary" class="bg-orange-100 text-orange-800">
                Development Only
            </Badge>
        </div>

        <!-- Template Suggestion Component Demo -->
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <FileText class="h-5 w-5" />
                    Template Suggestion Component
                </CardTitle>
                <CardDescription>
                    Test the template suggestion component with JSON schema-based autocomplete
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
                <TemplateSuggestionDemo />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <FileText class="h-5 w-5" />
                    JSON Schema Builder Component
                </CardTitle>
            </CardHeader>
            <CardContent class="space-y-6">
                <JsonSchemaBuilderDemo />
            </CardContent>
        </Card>

        <div class="grid gap-8 md:grid-cols-2">
            <!-- PromptSelector Section -->
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <FileText class="h-5 w-5" />
                        PromptSelector Component
                    </CardTitle>
                    <CardDescription>
                        Test the PromptSelector component with different configurations
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-6">
                    <!-- Basic PromptSelector -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium">Basic Usage</h4>
                        <PromptSelector v-model="selectedPromptId" label="Select Prompt" />
                        <p class="text-xs text-muted-foreground">
                            Selected: {{ selectedPromptId || 'None' }}
                        </p>
                    </div>
                    <Separator />
                    <!-- PromptSelector with null option -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium">With "All" Option</h4>
                        <PromptSelector v-model="selectedPromptIdWithNull" label="Select Prompt (with All option)"
                            :null-option="true" />
                        <p class="text-xs text-muted-foreground">
                            Selected: {{ selectedPromptIdWithNull || 'All' }}
                        </p>
                    </div>
                    <Separator />
                    <!-- PromptSelector without label -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium">No Label</h4>
                        <PromptSelector v-model="selectedPromptIdNoLabel" label="" />
                        <p class="text-xs text-muted-foreground">
                            Selected: {{ selectedPromptIdNoLabel || 'None' }}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <!-- ModelSelector Section -->
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Cpu class="h-5 w-5" />
                        ModelSelector Component
                    </CardTitle>
                    <CardDescription>
                        Test the ModelSelector component with different configurations
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-6">
                    <!-- Multiple Selection ModelSelector -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium">Multiple Selection (Default)</h4>
                        <ModelSelector v-model="selectedModels" label="Select Models" :multiple="true" />
                        <p class="text-xs text-muted-foreground">
                            Selected: {{ selectedModels.length > 0 ? selectedModels.join(', ') : 'None' }}
                        </p>
                    </div>
                    <Separator />

                    <!-- Single Selection ModelSelector -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium">Single Selection</h4>
                        <ModelSelector v-model="selectedSingleModel" label="Select Model" :multiple="false" />
                        <p class="text-xs text-muted-foreground">
                            Selected: {{ selectedSingleModel || 'None' }}
                        </p>
                    </div>
                    <Separator />

                    <!-- File Upload Support ModelSelector -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium">File Upload Support Only</h4>
                        <ModelSelector v-model="selectedFileUploadModels" label="Select Models (File Upload)"
                            :multiple="true" :supports-file-upload="true" />
                        <p class="text-xs text-muted-foreground">
                            Selected: {{ selectedFileUploadModels.length > 0 ? selectedFileUploadModels.join(', ') :
                                'None' }}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Reset Section -->
        <Card>
            <CardHeader>
                <CardTitle>Reset All Selections</CardTitle>
                <CardDescription>
                    Clear all component selections to test initial states
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button @click="resetAllSelections" variant="outline">
                    Reset All
                </Button>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FileText, Cpu, Zap } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PromptSelector from '@/components/prompts/PromptSelector.vue'
import ModelSelector from '@/components/ui/model-selector/ModelSelector.vue'
import { useUI } from '@/services/ui'
import Separator from '@/components/ui/separator/Separator.vue'
import TemplateSuggestionDemo from '@/components/ui/template-suggestion/TemplateSuggestionDemo.vue'
import JsonSchemaBuilderDemo from '@/components/ui/json-schema-builder/JsonSchemaBuilderDemo.vue'

const { success } = useUI()

// PromptSelector states
const selectedPromptId = ref<string>('')
const selectedPromptIdWithNull = ref<string>('')
const selectedPromptIdNoLabel = ref<string>('')

// ModelSelector states
const selectedModels = ref<string[]>([])
const selectedSingleModel = ref<string>('')
const selectedFileUploadModels = ref<string[]>([])

// Combined usage states
const combinedPromptId = ref<string>('')
const combinedModels = ref<string[]>([])

// Methods
const simulateExecution = () => {
    success(`Would execute prompt "${combinedPromptId.value}" with models: ${combinedModels.value.join(', ')}`)
}

const resetAllSelections = () => {
    // Reset all PromptSelector states
    selectedPromptId.value = ''
    selectedPromptIdWithNull.value = ''
    selectedPromptIdNoLabel.value = ''

    // Reset all ModelSelector states
    selectedModels.value = []
    selectedSingleModel.value = ''
    selectedFileUploadModels.value = []

    // Reset combined states
    combinedPromptId.value = ''
    combinedModels.value = []

    success('All component selections have been cleared')
}
</script>
