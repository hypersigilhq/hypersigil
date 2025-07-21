<template>
    <div class="flex min-h-screen items-center justify-center">
        <Card class="w-full max-w-md">
            <CardHeader>
                <h2 class="text-2xl font-bold">Login</h2>
                <p class="text-muted-foreground">Enter your credentials to access your account</p>
            </CardHeader>
            <CardContent>
                <div class="mt-7">

                    <Label>Email</Label>
                    <Input type="email" placeholder="email@example.com" required v-model="email" />
                </div>
                <div class="mt-7">
                    <Label>Password</Label>
                    <Input type="password" required v-model="password" />
                </div>

                <div class="mt-7">
                    <!-- Submit button -->
                    <Button type="submit" class="w-full" :disabled="isLoading" @click="handleSubmit">
                        {{ isLoading ? 'Logging in...' : 'Login' }}
                    </Button>
                </div>

                <!-- Error message -->
                <p v-if="errorMessage" class="mt-4 text-sm text-red-500">{{ errorMessage }}</p>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'
import { LoginRequestSchema } from '@/services/definitions/auth'
import Label from '@/components/ui/label/Label.vue'

const router = useRouter()
const { login, isLoading } = useAuth()

const email = ref('')
const password = ref('')
const errors = ref<Record<string, string>>({})
const errorMessage = ref('')

const validate = (): boolean => {
    errors.value = {}
    errorMessage.value = ''

    try {
        LoginRequestSchema.parse({ email: email.value, password: password.value })
        return true
    } catch (error) {
        if (error instanceof z.ZodError) {
            error.errors.forEach(err => {
                if (err.path.length > 0) {
                    errors.value[err.path[0]] = err.message
                }
            })
        }
        return false
    }
}

const handleSubmit = async () => {
    if (!validate()) return

    try {
        await login(email.value, password.value)
        router.push('/')
    } catch (error: any) {
        if (error.status === 401) {
            errorMessage.value = 'Invalid email or password'
        } else if (error.status === 400) {
            errorMessage.value = 'Invalid input data'
        } else {
            errorMessage.value = 'An unexpected error occurred'
            console.error('Login error:', error)
        }
    }
}
</script>
