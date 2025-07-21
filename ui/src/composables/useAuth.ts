import { ref, computed } from 'vue'
import { authApi, setAuthToken, userApi, userApiClient } from '@/services/api-client'
import type { AuthLoginResponse, AuthResponse, CheckResponse } from '@/services/definitions/auth'
import router from '@/router'

const currentUser = ref<AuthLoginResponse['user'] | null>(null)
const authToken = ref<string | null>(null)
const isLoading = ref(false)
const isAuthenticated = computed(() => !!authToken.value && !!currentUser.value)

export function useAuth() {

    const login = async (email: string, password: string): Promise<AuthLoginResponse> => {
        isLoading.value = true
        try {
            const response = await authApi.login({ email, password })

            // Store token and user data
            authToken.value = response.token
            currentUser.value = response.user
            localStorage.setItem('auth_token', response.token)

            // Update all API clients with new token
            setAuthToken(response.token)

            return response
        } catch (error) {
            console.error('Login error:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const registerFirstAdmin = async (name: string, email: string, password: string): Promise<AuthLoginResponse> => {
        isLoading.value = true
        try {
            const response = await authApi.registerFirstAdmin({ name, email, password })

            // Store token and user data
            authToken.value = response.token
            currentUser.value = response.user
            localStorage.setItem('auth_token', response.token)

            // Update all API clients with new token
            setAuthToken(response.token)

            return response
        } catch (error) {
            console.error('Register first admin error:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const logout = (): void => {
        // Clear auth state
        authToken.value = null
        currentUser.value = null
        localStorage.removeItem('auth_token')

        // Remove token from all API clients
        setAuthToken(null)
        router.push({ name: 'auth' })
    }

    const checkAuthStatus = async (): Promise<CheckResponse> => {
        return await authApi.check()
    }

    const activateUser = async (invitationToken: string, password: string) => {
        isLoading.value = true
        try {
            const response = await authApi.activate({ invitation_token: invitationToken, password })
            return response
        } catch (error) {
            console.error('User activation error:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const initAuth = async (): Promise<void> => {
        const token = localStorage.getItem('auth_token')
        if (token) {
            authToken.value = token
            setAuthToken(token)

            try {
                let user = await userApi.me()

                if (user) {
                    currentUser.value = user
                }
            } catch (e) {
                console.error(e)
                logout()
            }
        }
    }

    return {
        currentUser,
        authToken,
        isAuthenticated,
        isLoading,
        login,
        registerFirstAdmin,
        activateUser,
        logout,
        checkAuthStatus,
        initAuth
    }
}
