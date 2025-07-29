# ModelSelector Component

A reusable Vue component for selecting AI models from available providers. Supports both single and multiple selection modes with search functionality and file upload filtering.

## Features

- **Multiple/Single Selection**: Configure whether users can select one or multiple models
- **File Upload Support**: Filter models based on file upload capabilities
- **Search Functionality**: Built-in search to filter models by provider or model name
- **Preselected Models**: Support for pre-populating with selected models
- **Loading States**: Handles loading states and error messages
- **Event Emission**: Emits selection changes for parent components to react

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string \| string[]` | `[]` | The selected model(s) - supports v-model |
| `label` | `string` | `"Provider/Model"` | Label text displayed above the selector |
| `multiple` | `boolean` | `true` | Whether to allow multiple model selection |
| `supportsFileUpload` | `boolean` | `false` | Filter models that support file upload |
| `preselectedModels` | `string[]` | `[]` | Array of model IDs to preselect |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string \| string[]` | Emitted when selection changes (v-model) |
| `selection-changed` | `string[]` | Emitted with array of selected model IDs |

## Usage Examples

### Basic Multiple Selection
```vue
<template>
  <ModelSelector 
    v-model="selectedModels"
    label="Choose AI Models"
    :multiple="true"
    @selection-changed="onModelsChanged"
  />
</template>

<script setup>
import { ref } from 'vue'
import { ModelSelector } from '@/components/ui/model-selector'

const selectedModels = ref([])

const onModelsChanged = (models) => {
  console.log('Selected models:', models)
}
</script>
```

### Single Selection Mode
```vue
<template>
  <ModelSelector 
    v-model="selectedModel"
    label="Choose One Model"
    :multiple="false"
  />
</template>

<script setup>
import { ref } from 'vue'
import { ModelSelector } from '@/components/ui/model-selector'

const selectedModel = ref('')
</script>
```

### File Upload Support Filter
```vue
<template>
  <ModelSelector 
    v-model="selectedModels"
    label="Models with File Upload"
    :multiple="true"
    :supports-file-upload="true"
  />
</template>
```

### With Preselected Models
```vue
<template>
  <ModelSelector 
    v-model="selectedModels"
    :preselected-models="['openai:gpt-4', 'anthropic:claude-3']"
    label="AI Models"
  />
</template>

<script setup>
import { ref } from 'vue'

const selectedModels = ref(['openai:gpt-4', 'anthropic:claude-3'])
</script>
```

## Model Format

Models are returned in the format `provider:model`, for example:
- `openai:gpt-4`
- `anthropic:claude-3-sonnet`
- `ollama:llama2`

## Styling

The component uses Tailwind CSS classes and follows the existing design system. It includes:
- Loading states with skeleton UI
- Error states with appropriate messaging
- Hover and focus states
- Responsive design
- Consistent spacing and typography

## Integration Notes

- The component automatically loads available models from the API
- Models are filtered based on the `supportsFileUpload` prop
- Search functionality filters by provider name, model name, or combined string
- Selected models are displayed as removable pills/badges
- The component handles both controlled and uncontrolled usage patterns
