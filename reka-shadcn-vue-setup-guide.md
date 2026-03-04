# Reka UI + Shadcn Vue Setup Guide

This guide provides comprehensive instructions for implementing the same styling and architecture used in the Hypersigil Vue.js application, which combines Reka UI (Radix Vue) primitives with Shadcn Vue components.

## Table of Contents

1. [Package.json Setup](#packagejson-setup)
2. [Project Structure](#project-structure)
3. [Configuration Files](#configuration-files)
4. [Styling Architecture](#styling-architecture)
5. [Component Architecture](#component-architecture)
6. [Usage Patterns](#usage-patterns)
7. [Building Custom Components](#building-custom-components)
8. [Advanced Patterns](#advanced-patterns)

## Package.json Setup

Start with a fresh Vue 3 project and install the required dependencies:

```json
{
  "name": "your-vue-app",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview",
    "build-only": "vite build",
    "type-check": "vue-tsc --build",
    "lint": "eslint . --fix",
    "format": "prettier --write src/"
  },
  "dependencies": {
    "@vueuse/core": "^13.5.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-vue-next": "^0.525.0",
    "reka-ui": "^2.3.2",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.3.5",
    "vue": "^3.5.17",
    "vue-router": "^4.5.1",
    "zod": "^4.0.5"
  },
  "devDependencies": {
    "@tsconfig/node22": "^22.0.2",
    "@types/lodash-es": "^4.17.12",
    "@types/node": "^22.15.32",
    "@vitejs/plugin-vue": "^6.0.0",
    "@vue/eslint-config-prettier": "^10.2.0",
    "@vue/eslint-config-typescript": "^14.5.1",
    "@vue/tsconfig": "^0.7.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.29.0",
    "eslint-plugin-vue": "~10.2.0",
    "jiti": "^2.4.2",
    "npm-run-all2": "^8.0.4",
    "postcss": "^8.5.6",
    "prettier": "3.5.3",
    "shadcn-vue": "^2.2.0",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.8.0",
    "vite": "^7.0.0",
    "vite-plugin-vue-devtools": "^7.7.7",
    "vue-tsc": "^2.2.10"
  }
}
```

Key dependencies explained:
- `reka-ui`: Radix UI Vue primitives (headless components)
- `shadcn-vue`: CLI tool for installing Shadcn components
- `class-variance-authority`: Utility for creating component variants
- `clsx` & `tailwind-merge`: For conditional and merged Tailwind classes
- `lucide-vue-next`: Icon library
- `@vueuse/core`: Vue composition utilities

## Project Structure

Create the following directory structure:

```
your-vue-app/
├── src/
│   ├── assets/
│   │   └── main.css
│   ├── components/
│   │   └── ui/           # Shadcn components
│   │       ├── button/
│   │       ├── input/
│   │       ├── card/
│   │       └── ...
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   └── composables/      # Vue composables
├── components.json       # Shadcn configuration
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Configuration Files

### components.json

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york",
  "typescript": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/assets/main.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "composables": "@/composables",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib"
  },
  "iconLibrary": "lucide"
}
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [],
}
```

### vite.config.ts

```typescript
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
```

## Styling Architecture

### src/assets/main.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

### src/lib/utils.ts

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Component Architecture

### Installing Shadcn Components

Use the Shadcn CLI to install components:

```bash
# Initialize shadcn-vue
npx shadcn-vue@latest init

# Install individual components
npx shadcn-vue@latest add button
npx shadcn-vue@latest add input
npx shadcn-vue@latest add card
npx shadcn-vue@latest add dialog
# ... etc
```

### Component Structure Pattern

Each component follows this structure:

```
src/components/ui/[component-name]/
├── [ComponentName].vue    # Main component
├── index.ts              # Exports and types
└── (optional sub-components)
```

#### Example: Button Component

**src/components/ui/button/Button.vue:**
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { cn } from '@/lib/utils'
import { type ButtonVariants, buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <Primitive
    data-slot="button"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
```

**src/components/ui/button/index.ts:**
```typescript
import { cva, type VariantProps } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
```

#### Example: Input Component

**src/components/ui/input/Input.vue:**
```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>(), {})

const emit = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()
</script>

<template>
  <input
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    :class="cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  >
</template>
```

## Usage Patterns

### Basic Component Usage

```vue
<template>
  <div class="p-6 space-y-4">
    <!-- Button variants -->
    <Button>Default Button</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>

    <!-- Button sizes -->
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
    <Button size="icon">
      <PlusIcon />
    </Button>

    <!-- Input with v-model -->
    <Input v-model="email" placeholder="Enter email" />

    <!-- Card component -->
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlusIcon } from 'lucide-vue-next'

import { ref } from 'vue'

const email = ref('')
</script>
```

### Advanced Component Composition

```vue
<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button>Open Dialog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogDescription>
          Are you sure you want to proceed?
        </DialogDescription>
      </DialogHeader>
      <div class="flex justify-end space-x-2">
        <Button variant="outline">Cancel</Button>
        <Button @click="confirm">Confirm</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const confirm = () => {
  // Handle confirmation
}
</script>
```

## Building Custom Components

### Creating a Custom Form Component

**src/components/ui/custom-form/CustomForm.vue:**
```vue
<script setup lang="ts">
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password'
  placeholder?: string
  required?: boolean
}

interface Props {
  title: string
  fields: FormField[]
  submitText?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  submitText: 'Submit',
})

const emit = defineEmits<{
  submit: [data: Record<string, string>]
}>()

const formData = ref<Record<string, string>>({})

const handleSubmit = () => {
  emit('submit', formData.value)
}
</script>

<template>
  <Card :class="cn('w-full max-w-md', props.class)">
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div v-for="field in fields" :key="field.name" class="space-y-2">
          <Label :for="field.name">{{ field.label }}</Label>
          <Input
            :id="field.name"
            v-model="formData[field.name]"
            :type="field.type"
            :placeholder="field.placeholder"
            :required="field.required"
          />
        </div>
        <Button type="submit" class="w-full">
          {{ submitText }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
```

**Usage:**
```vue
<template>
  <CustomForm
    title="Sign Up"
    :fields="formFields"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
import CustomForm from '@/components/ui/custom-form/CustomForm.vue'

const formFields = [
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Password', type: 'password', required: true },
]

const handleSubmit = (data: Record<string, string>) => {
  console.log('Form submitted:', data)
}
</script>
```

### Creating a Data Table Component

**src/components/ui/data-table/DataTable.vue:**
```vue
<script setup lang="ts" generic="T">
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next'

interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
}

interface Props<T> {
  data: T[]
  columns: Column<T>[]
  class?: string
}

defineProps<Props<T>>()

const emit = defineEmits<{
  sort: [key: keyof T]
}>()
</script>

<template>
  <div :class="cn('space-y-4', props.class)">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="column in columns"
            :key="String(column.key)"
            :class="{ 'cursor-pointer hover:bg-muted/50': column.sortable }"
            @click="column.sortable && emit('sort', column.key)"
          >
            {{ column.label }}
            <span v-if="column.sortable" class="ml-1">↕</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="item in data" :key="item.id || JSON.stringify(item)">
          <TableCell v-for="column in columns" :key="String(column.key)">
            {{ item[column.key] }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
```

**Usage:**
```vue
<template>
  <DataTable
    :data="users"
    :columns="columns"
    @sort="handleSort"
  />
</template>

<script setup lang="ts">
import DataTable from '@/components/ui/data-table/DataTable.vue'

interface User {
  id: number
  name: string
  email: string
  role: string
}

const users = ref<User[]>([
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
])

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role' },
]

const handleSort = (key: keyof User) => {
  // Handle sorting logic
}
</script>
```

## Advanced Patterns

### Theme Provider

**src/components/theme-provider/ThemeProvider.vue:**
```vue
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <div :class="isDark ? 'dark' : ''">
    <slot />
  </div>
</template>
```

### Toast Service

**src/services/toast.ts:**
```typescript
import { reactive } from 'vue'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

const toasts = reactive<Toast[]>([])

export const toast = {
  add: (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString()
    toasts.push({ ...toast, id })
    setTimeout(() => {
      const index = toasts.findIndex(t => t.id === id)
      if (index > -1) toasts.splice(index, 1)
    }, 5000)
  },
  remove: (id: string) => {
    const index = toasts.findIndex(t => t.id === id)
    if (index > -1) toasts.splice(index, 1)
  },
}

export const useToast = () => ({
  toasts: readonly(toasts),
  toast,
})
```

### Form Validation with Zod

**src/composables/useForm.ts:**
```typescript
import { ref, computed } from 'vue'
import { z } from 'zod'

export function useForm<T extends z.ZodSchema>(
  schema: T,
  initialValues: z.infer<T>
) {
  const values = ref<z.infer<T>>(initialValues)
  const errors = ref<Partial<Record<keyof z.infer<T>, string>>>({})

  const validate = () => {
    const result = schema.safeParse(values.value)
    if (result.success) {
      errors.value = {}
      return true
    } else {
      errors.value = result.error.flatten().fieldErrors as any
      return false
    }
  }

  const reset = () => {
    values.value = initialValues
    errors.value = {}
  }

  return {
    values,
    errors,
    validate,
    reset,
    isValid: computed(() => Object.keys(errors.value).length === 0),
  }
}
```

This guide covers the complete setup and usage patterns for implementing Reka UI + Shadcn Vue components in a Vue.js application with the same architecture and styling as the Hypersigil project.
