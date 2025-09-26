# JSON Schema Form Generator Component

## Overview
A comprehensive form generation system that automatically creates interactive forms from JSON schemas. This component supports all major JSON Schema types, validation rules, and complex nested structures.

## Features

### Core Functionality
- **Automatic Form Generation**: Creates forms dynamically from JSON schema definitions
- **Type Support**: Full support for string, number, boolean, object, and array types
- **Validation**: Built-in validation with real-time error feedback
- **Nested Structures**: Handles complex nested objects and arrays recursively
- **Enum Support**: Dropdown selects for enumerated values with descriptions
- **Reactive Data Binding**: Two-way data binding with v-model support

### Field Types Supported
1. **TextField**: For string inputs with optional validation (minLength, maxLength, pattern)
2. **NumberField**: For numeric inputs with min/max constraints
3. **BooleanField**: Checkbox inputs for boolean values
4. **EnumField**: Select dropdowns for enumerated values
5. **ObjectField**: Nested object forms with recursive rendering
6. **ArrayField**: Dynamic arrays with add/remove functionality

### Validation Features
- Required field validation
- Type-specific validation (string length, number ranges, patterns)
- Real-time error display
- Form-level error aggregation

## Architecture

### Component Structure
```
ui/src/components/ui/json-schema-form/
├── JsonSchemaForm.vue          # Main form component
├── JsonSchemaFormDemo.vue      # Demo component for playground
├── TextField.vue              # String input field
├── NumberField.vue            # Number input field
├── BooleanField.vue           # Boolean checkbox field
├── EnumField.vue              # Enum select field
├── ObjectField.vue            # Nested object field
├── ArrayField.vue             # Dynamic array field
├── types.ts                   # TypeScript type definitions
├── utils.ts                   # Utility functions
└── index.ts                   # Component exports
```

### Key Components

#### JsonSchemaForm.vue
- Main orchestrator component
- Parses JSON schema and generates appropriate field components
- Manages form state and validation
- Emits form data and validation errors

#### Field Components
Each field component follows a consistent interface:
- Props: `field` (FormField config), `modelValue`, `readonly`, `error`
- Emits: `update:modelValue` with appropriate type
- Handles field-specific validation and rendering

### Type System
```typescript
interface FormField {
    name: string
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    label: string
    description?: string
    required: boolean
    validation?: FieldValidation
    children?: FormField[] // For objects
    items?: FormField      // For arrays
}

interface FieldValidation {
    minLength?: number
    maxLength?: number
    minimum?: number
    maximum?: number
    pattern?: string
    enum?: string[]
    enumValues?: EnumValue[]
}
```

## Usage

### Basic Usage
```vue
<template>
  <JsonSchemaForm
    :schema="mySchema"
    v-model="formData"
    @submit="handleSubmit"
    @error="handleErrors"
  />
</template>

<script setup>
import { JsonSchemaForm } from '@/components/ui/json-schema-form'

const mySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'number', minimum: 0 }
  },
  required: ['name']
}

const formData = ref({})
</script>
```

### Integration with JSON Schema Builder
The component is designed to work seamlessly with the existing JSON Schema Builder component in the playground. Users can:
1. Build schemas using the JSON Schema Builder
2. Generate forms automatically from those schemas
3. Test form functionality in real-time

## Demo Features

### Playground Integration
- Added to `PlaygroundView.vue` as a separate demo section
- Includes example schemas for quick testing
- Real-time form data display
- Validation error visualization
- Read-only mode toggle

### Example Schemas
1. **User Profile**: Basic user information with validation
2. **Product Catalog**: Complex nested structure with arrays and objects

## Technical Implementation

### Form State Management
- Uses Vue 3 Composition API with reactive state
- Deep watching for nested object changes
- Proper TypeScript typing throughout

### Validation Strategy
- Client-side validation using schema constraints
- Real-time validation feedback
- Error aggregation and display

### Performance Considerations
- Lazy rendering of nested components
- Efficient reactive updates
- Minimal re-renders through proper key usage

## Future Enhancements

### Planned Features
- Support for additional JSON Schema features (oneOf, anyOf, allOf)
- Custom field components for specialized types
- Form submission with different encodings (multipart, JSON)
- Integration with backend validation APIs
- Advanced array operations (reordering, bulk actions)

### Potential Improvements
- Better handling of circular references in schemas
- Performance optimization for very large forms
- Accessibility improvements (ARIA labels, keyboard navigation)
- Internationalization support
- Theme customization options

## Dependencies
- Vue 3 Composition API
- Existing UI components (Input, Textarea, Select, Checkbox, etc.)
- TypeScript for type safety
- JSON Schema validation utilities

## Testing
- Integrated into component playground for manual testing
- Example schemas provided for regression testing
- Real-time validation feedback for user testing

## Related Components
- **JsonSchemaBuilderDemo**: Schema creation interface
- **TemplateSuggestionDemo**: Related JSON schema functionality
- **UI Components**: Leverages existing shadcn/ui components

## Notes
- Component is designed to be self-contained within the json-schema-form directory
- Follows existing project patterns for component structure and naming
- Maintains consistency with other UI components in terms of styling and behavior
