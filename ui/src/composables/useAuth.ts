import { ref, computed } from 'vue'
import { authApi, setAuthToken, userApi } from '@/services/api-client'
import type { AuthLoginResponse, CheckResponse } from '@/services/definitions/auth'
import { useEventListener } from '@/services/event-patterns'
import { eventBus } from '@/services/event-bus'
import router from '@/router'

const currentUser = ref<AuthLoginResponse['user'] | null>(null)
const authToken = ref<string | null>(null)
const isLoading = ref(false)
const isAuthenticated = computed(() => !!authToken.value && !!currentUser.value)

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 30) => {
    const expires = new Date()
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
}

const getCookie = (name: string): string | null => {
    const nameEQ = name + "="
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === ' ') c = c.substring(1, c.length)
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
}

const deleteCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
}

export function useAuth() {
    // Listen for token expiration events
    useEventListener('auth:token-expired', () => {
        logout()
    })

    const login = async (email: string, password: string): Promise<AuthLoginResponse> => {
        isLoading.value = true
        try {
            const response = await authApi.login({ email, password })

            // Store token and user data
            authToken.value = response.token
            currentUser.value = response.user
            localStorage.setItem('auth_token', response.token)
            setCookie('auth-token', response.token)

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
            setCookie('auth-token', response.token)

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
        // Emit logout event
        eventBus.emit('auth:logout')

        // Clear auth state
        authToken.value = null
        currentUser.value = null
        localStorage.removeItem('auth_token')
        deleteCookie('auth-token')

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
        const token = localStorage.getItem('auth_token') || getCookie('auth-token')
        if (token) {
            authToken.value = token
            setAuthToken(token)

            // Sync token between localStorage and cookie
            if (!localStorage.getItem('auth_token')) {
                localStorage.setItem('auth_token', token)
            }
            if (!getCookie('auth-token')) {
                setCookie('auth-token', token)
            }

            try {
                let user = await userApi.me()

                if (user) {
                    currentUser.value = user
                    eventBus.emit('app:loaded')
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
