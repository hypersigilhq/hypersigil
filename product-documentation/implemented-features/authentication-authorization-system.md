# Authentication and Authorization System

## Overview

A comprehensive authentication and authorization system has been implemented using self-signed tokens with database validation. The system provides secure user authentication, role-based access control, and middleware-based protection for API endpoints.

## Architecture

### Self-Signed Token System

The authentication system uses self-signed tokens instead of JWT for simplicity and better control:

**Token Structure:**
```
{userId}.{timestamp}.{signature}
```

- `userId`: The user's database ID
- `timestamp`: Unix timestamp when token was issued
- `signature`: HMAC-SHA256 signature using a secret key

**Benefits:**
- No database storage required for tokens
- Tamper-proof with HMAC signature
- Built-in expiry validation
- Real-time user status validation on each request
- Immediate revocation by deactivating user

### Security Features

1. **Password Security:**
   - bcrypt hashing with configurable rounds (default: 12)
   - Minimum password length validation (8 characters)
   - Account lockout after 5 failed attempts (30 minutes)

2. **Token Security:**
   - HMAC-SHA256 signature prevents tampering
   - Configurable token expiry (default: 30 days)
   - Secret key rotation invalidates all tokens

3. **Database Validation:**
   - Every request validates user exists and is active
   - Account lock status checked on each request
   - User role verified for authorization

## API Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/register-first-admin
Register the first admin user when no users exist in the system.

**Request:**
```json
{
  "email": "admin@example.com",
  "name": "Admin User",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "token": "user-id.timestamp.signature",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin",
    "status": "active",
    "created_at": "2025-01-20T22:47:00.000Z",
    "updated_at": "2025-01-20T22:47:00.000Z"
  }
}
```

**Error Responses:**
- `409 Conflict`: Users already exist in the system
- `400 Bad Request`: Invalid input data

#### POST /api/v1/auth/login
Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response (200):**
```json
{
  "token": "user-id.timestamp.signature",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "status": "active",
    "created_at": "2025-01-20T22:47:00.000Z",
    "updated_at": "2025-01-20T22:47:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid email or password
- `401 Unauthorized`: Account locked due to failed attempts
- `401 Unauthorized`: Account not active

#### GET /api/v1/auth/me
Get current authenticated user information (requires authentication).

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "status": "active",
  "created_at": "2025-01-20T22:47:00.000Z",
  "updated_at": "2025-01-20T22:47:00.000Z"
}
```

## Middleware System

### Authentication Middleware

**Location:** `backend/src/app.ts`

The `authMiddleware` validates tokens and attaches user information to requests:

```typescript
export const authMiddleware: EndpointMiddleware = async (req, res, next) => {
  // Token validation and user verification logic
  (req as any).user = user; // Attach user to request
  next();
};
```

### Authorization Middleware

Role-based authorization middleware factory:

```typescript
export const requireRole = (roles: string[]): EndpointMiddleware => {
  return (req, res, next) => {
    const user = (req as any).user;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

**Convenience Middleware:**
- `requireAdmin`: Admin-only access
- `requireUser`: Admin or User access
- `requireAuth`: Any authenticated user (admin, user, viewer)

## User Roles

1. **Admin**: Full system access, can manage users and all resources
2. **User**: Standard user access, can create and manage own content
3. **Viewer**: Read-only access to permitted resources

## Implementation Files

### Backend Files

1. **API Definitions:**
   - `backend/src/api/definitions/auth.ts` - Authentication API schemas

2. **Handlers:**
   - `backend/src/api/handlers/auth.ts` - Authentication endpoint handlers

3. **Services:**
   - `backend/src/services/auth-service.ts` - Authentication business logic

4. **Middleware:**
   - `backend/src/app.ts` - Authentication and authorization middleware
   - `backend/src/middleware/auth-middleware.ts` - Standalone middleware (alternative)

### Frontend Files

1. **API Definitions:**
   - `ui/src/services/definitions/auth.ts` - Frontend authentication types

## Configuration

### Environment Variables

Add to `.env` file:

```env
# Authentication Configuration
AUTH_SECRET_KEY=your-secret-key-here-32-chars-minimum
TOKEN_MAX_AGE_DAYS=30
BCRYPT_ROUNDS=12
```

### Security Recommendations

1. **Production Setup:**
   - Use a strong, randomly generated `AUTH_SECRET_KEY`
   - Set appropriate `TOKEN_MAX_AGE_DAYS` based on security requirements
   - Monitor failed login attempts
   - Implement rate limiting for authentication endpoints

2. **Token Management:**
   - Store tokens securely in client (httpOnly cookies recommended)
   - Implement token refresh mechanism if needed
   - Clear tokens on logout

## Usage Examples

### Client-Side Authentication

```typescript
// Login
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await loginResponse.json();

// Store token securely
localStorage.setItem('authToken', token);

// Use token in subsequent requests
const response = await fetch('/api/v1/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Protecting Endpoints

```typescript
// Apply authentication to specific endpoints
RegisterHandlers(app, ApiDefinition, {
  // handlers
}, [loggingMiddleware, timingMiddleware], {
  domain: {
    protectedEndpoint: [authMiddleware, requireAdmin]
  }
});
```

## Security Considerations

1. **Token Security:**
   - Tokens are self-contained and stateless
   - No token storage in database reduces attack surface
   - HMAC signature prevents token tampering

2. **Password Security:**
   - bcrypt with high cost factor (12 rounds)
   - Account lockout prevents brute force attacks
   - Password strength validation

3. **Database Validation:**
   - Real-time user status checking
   - Immediate effect of user deactivation
   - Account lock status enforced

4. **Error Handling:**
   - Generic error messages to prevent information leakage
   - Detailed logging for security monitoring
   - Rate limiting recommended for production

## Future Enhancements

1. **Password Reset:** Email-based password reset functionality
2. **Two-Factor Authentication:** TOTP or SMS-based 2FA
3. **Session Management:** Advanced session handling and concurrent login limits
4. **Audit Logging:** Comprehensive authentication and authorization logging
5. **OAuth Integration:** Support for third-party authentication providers
