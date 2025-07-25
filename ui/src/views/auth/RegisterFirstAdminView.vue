<template>
    <div class="flex min-h-screen items-center justify-center">
        <Card class="w-full max-w-md">
            <CardHeader>
                <h2 class="text-2xl font-bold">Create Admin Account</h2>
                <p class="text-muted-foreground">Set up the first administrator account</p>
            </CardHeader>
            <CardContent>
                <div class="mt-6">

                    <Label>Name</Label>
                    <Input placeholder="Your name" required v-model="name" />
                </div>
                <div class="mt-6">
                    <!-- Email field -->
                    <Label>Email</Label>
                    <Input type="email" placeholder="email@example.com" required v-model="email" />

                </div>
                <div class="mt-6">
                    <!-- Password field -->
                    <Label>Password</Label>
                    <Input type="password" placeholder="Min. 8 characters" required v-model="password" />

                </div>
                <div class="mt-6">
                    <!-- Submit button -->
                    <Button type="submit" class="w-full" :disabled="isLoading" @click="handleSubmit">
                        {{ isLoading ? 'Creating account...' : 'Create Admin Account' }}
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
import { RegisterFirstAdminRequestSchema } from '@/services/definitions/auth'
import Label from '@/components/ui/label/Label.vue'

const router = useRouter()
const { registerFirstAdmin, isLoading } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const errors = ref<Record<string, string>>({})
const errorMessage = ref('')

const validate = (): boolean => {
    errors.value = {}
    errorMessage.value = ''

    try {
        RegisterFirstAdminRequestSchema.parse({
            name: name.value,
            email: email.value,
            password: password.value
        })
        return true
    } catch (error) {
        console.log(error)
        if (error instanceof z.ZodError) {
            error.issues.forEach(err => {
                if (err.path.length > 0) {
                    errors.value[err.path[0].toString()] = err.message
                }
            })
        }
        return false
    }
}

const handleSubmit = async () => {
    if (!validate()) return

    try {
        await registerFirstAdmin(name.value, email.value, password.value)
        router.push('/')
    } catch (error: any) {
        if (error.status === 409) {
            errorMessage.value = 'Users already exist in the system'
        } else if (error.status === 400) {
            errorMessage.value = 'Invalid input data'
        } else {
            errorMessage.value = 'An unexpected error occurred'
            console.error('Registration error:', error)
        }
    }
}
</script>
