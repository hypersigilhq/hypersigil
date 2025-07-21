# Login and First-Time Register Implementation

## Overview

This feature implements a complete authentication flow for the application, including login functionality and first-time admin registration. The implementation leverages the existing backend authentication system and integrates it with the frontend using Vue 3 Composition API.

## Features

1. **Authentication State Management**
   - Centralized auth state using Vue 3 Composition API
   - Token storage in localStorage
   - Automatic token inclusion in API requests
   - Token validation on app startup

2. **Login Screen**
   - Clean, user-friendly login form
   - Email and password fields with validation
   - Error handling and feedback
   - Redirect to dashboard after successful login

3. **First-Time Admin Registration**
   - Special flow for setting up the first admin account
   - Name, email, and password fields with validation
   - Automatic detection of whether first-time setup is needed
   - Seamless transition to main application after registration

4. **Authentication Flow**
   - Automatic check if first admin needs to be registered
   - Conditional rendering of login or register form
   - Loading states during authentication operations
   - Error handling for all authentication scenarios

5. **Route Protection**
   - Navigation guards for protected routes
   - Redirect to auth flow for unauthenticated users
   - Redirect to dashboard for authenticated users trying to access auth pages

## Technical Implementation

### Authentication State Management

A custom `useAuth` composable provides centralized authentication state management:

```typescript
// ui/src/composables/useAuth.ts
export function useAuth() {
  const currentUser = ref<AuthResponse['user'] | null>(null)
  const authToken = ref<string | null>(null)
  const isAuthenticated = computed(() => !!authToken.value && !!currentUser.value)
  
  // Authentication methods
  const login = async (email: string, password: string) => { /* ... */ }
  const registerFirstAdmin = async (name: string, email: string, password: string) => { /* ... */ }
  const logout = () => { /* ... */ }
  const checkAuthStatus = async () => { /* ... */ }
  const initAuth = () => { /* ... */ }
  
  return { /* ... */ }
}
```

### API Client Integration

The API client was extended to support authentication:

```typescript
// ui/src/services/api-client.ts
export const authApiClient = new ApiClient(
    document.location.origin,
    AuthApiDefinition
);

// Token management function
export const setAuthToken = (token: string | null): void => {
    if (token) {
        allApiClients.forEach(client => {
            client.setHeader('Authorization', `Bearer ${token}`);
        });
    } else {
        allApiClients.forEach(client => {
            client.removeHeader('Authorization');
        });
    }
};
```

### Authentication Views

Two main authentication views were implemented:

1. **LoginView.vue** - Handles user login with email and password
2. **RegisterFirstAdminView.vue** - Handles first-time admin registration

Both views include:
- Form validation using Zod schemas
- Error handling and user feedback
- Loading states during authentication operations

### Authentication Flow Component

The `AuthFlow.vue` component orchestrates the authentication process:

```typescript
// ui/src/components/auth/AuthFlow.vue
onMounted(async () => {
    try {
        const response = await checkAuthStatus()
        shouldShowRegisterFirstAdmin.value = response.shouldRedirectToRegisterFirstAdmin
    } catch (err) {
        console.error('Error checking auth status:', err)
    } finally {
        isLoading.value = false
    }
})
```

### Router Integration

The Vue Router was updated with authentication guards:

```typescript
// ui/src/router/index.ts
router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, initAuth } = useAuth()
  
  // Initialize auth state
  await initAuth()
  
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'auth' })
  } else if (to.meta.requiresGuest && isAuthenticated.value) {
    next({ name: 'home' })
  } else {
    next()
  }
})
```

## User Experience

1. **First-Time Setup**
   - On first application access, user is directed to the admin registration form
   - After creating the admin account, user is automatically logged in and redirected to the dashboard

2. **Normal Login Flow**
   - Returning users see the login form
   - After successful login, users are redirected to the dashboard
   - Failed login attempts show appropriate error messages

3. **Authentication Persistence**
   - Authentication state persists across page refreshes
   - Token is automatically included in all API requests
   - Session expires based on backend token configuration

## Security Considerations

1. **Token Storage**
   - Tokens are stored in localStorage for persistence
   - All API requests automatically include the token in the Authorization header

2. **Form Validation**
   - Client-side validation using Zod schemas
   - Server-side validation for additional security

3. **Error Handling**
   - Generic error messages to prevent information leakage
   - Detailed logging for debugging

## Future Enhancements

1. **Remember Me Functionality**
   - Add option to remember login across browser sessions

2. **Password Reset**
   - Implement forgot password flow

3. **Two-Factor Authentication**
   - Add support for 2FA using TOTP or SMS

4. **Session Management**
   - Add ability to view and manage active sessions
   - Add ability to log out from all devices

5. **User Profile Management**
   - Add ability to update user profile information
   - Add ability to change password
