<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">About</h1>
      <p class="text-muted-foreground">
        Learn more about this Vue TypeScript application.
      </p>
    </div>

    <Separator />

    <div class="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Code class="h-5 w-5" />
            Technology Stack
          </CardTitle>
          <CardDescription>
            Built with modern web technologies
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm">Vue 3</span>
            <span class="text-xs text-muted-foreground">Framework</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">TypeScript</span>
            <span class="text-xs text-muted-foreground">Language</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">Vite</span>
            <span class="text-xs text-muted-foreground">Build Tool</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">Tailwind CSS</span>
            <span class="text-xs text-muted-foreground">Styling</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">shadcn-vue</span>
            <span class="text-xs text-muted-foreground">UI Components</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Palette class="h-5 w-5" />
            Features
          </CardTitle>
          <CardDescription>
            What's included in this template
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex items-center gap-2">
            <CheckCircle class="h-4 w-4 text-green-500" />
            <span class="text-sm">Responsive sidebar navigation</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle class="h-4 w-4 text-green-500" />
            <span class="text-sm">Mobile-friendly design</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle class="h-4 w-4 text-green-500" />
            <span class="text-sm">TypeScript support</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle class="h-4 w-4 text-green-500" />
            <span class="text-sm">Modern UI components</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle class="h-4 w-4 text-green-500" />
            <span class="text-sm">Vue Router integration</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <BookOpen class="h-5 w-5" />
          Getting Started
        </CardTitle>
        <CardDescription>
          How to use this template
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <h4 class="text-sm font-medium">1. Development</h4>
          <p class="text-sm text-muted-foreground">
            Run <code class="bg-muted px-1 py-0.5 rounded text-xs">npm run dev</code> to start the development server.
          </p>
        </div>
        <div class="space-y-2">
          <h4 class="text-sm font-medium">2. Build</h4>
          <p class="text-sm text-muted-foreground">
            Run <code class="bg-muted px-1 py-0.5 rounded text-xs">npm run build</code> to build for production.
          </p>
        </div>
        <div class="space-y-2">
          <h4 class="text-sm font-medium">3. Customize</h4>
          <p class="text-sm text-muted-foreground">
            Modify components in the <code class="bg-muted px-1 py-0.5 rounded text-xs">src/components</code> directory
            and add new pages in <code class="bg-muted px-1 py-0.5 rounded text-xs">src/views</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, CheckCircle, Code, Palette } from 'lucide-vue-next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
</script>
