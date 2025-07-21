<template>
    <div class="flex min-h-screen items-center justify-center">
        <Card class="w-full max-w-md">
            <CardHeader>
                <h2 class="text-2xl font-bold">Set Up Your Password</h2>
                <p class="text-muted-foreground">Complete your account setup by creating a password</p>
            </CardHeader>
            <CardContent>
                <div class="mt-6">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Min. 8 characters" required v-model="password" />
                </div>
                <div class="mt-6">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="Confirm your password" required v-model="confirmPassword" />
                </div>
                <div class="mt-6">
                    <Button type="submit" class="w-full" :disabled="isLoading" @click="handleSubmit">
                        {{ isLoading ? 'Setting up account...' : 'Complete Setup' }}
                    </Button>
                </div>
                <p v-if="errorMessage" class="mt-4 text-sm text-red-500">{{ errorMessage }}</p>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/composables/useAuth'
import Label from '@/components/ui/label/Label.vue'

const router = useRouter()
const route = useRoute()
const { activateUser, isLoading } = useAuth()

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const invitationToken = ref('')

onMounted(() => {
    invitationToken.value = route.params.token as string
    if (!invitationToken.value) {
        errorMessage.value = 'Invalid invitation link'
    }
})

const validate = (): boolean => {
    errorMessage.value = ''

    if (!invitationToken.value) {
        errorMessage.value = 'Invalid invitation link'
        return false
    }

    if (!password.value) {
        errorMessage.value = 'Password is required'
        return false
    }

    if (password.value.length < 8) {
        errorMessage.value = 'Password must be at least 8 characters long'
        return false
    }

    if (password.value !== confirmPassword.value) {
        errorMessage.value = 'Passwords do not match'
        return false
    }

    return true
}

const handleSubmit = async () => {
    if (!validate()) return

    try {
        await activateUser(invitationToken.value, password.value)
        // Redirect to login after successful activation
        router.push({ name: 'auth' })
    } catch (error: any) {
        if (error.message.includes('Invalid or expired invitation')) {
            errorMessage.value = 'This invitation link is invalid or has expired'
        } else if (error.message.includes('Bad request')) {
            errorMessage.value = 'Invalid input data'
        } else {
            errorMessage.value = 'An unexpected error occurred'
            console.error('Activation error:', error)
        }
    }
}
</script>
