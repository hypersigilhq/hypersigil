# User Management System Implementation

## Overview
Implemented a comprehensive user management system with invitation-based user registration, role-based access control, and profile management capabilities.

## Architecture

### Database Model
- **UserModel**: Extends the base Model class with user-specific functionality
- **UserDocument Interface**: Defines the complete user data structure including:
  - Basic info: email, name, role, status
  - Profile data: first_name, last_name, avatar_url, timezone, preferences
  - Authentication data: password_hash, login attempts, account locking
  - Invitation system: tokens, expiration, invitation tracking

### User Roles
- **admin**: Full system access
- **user**: Standard user access
- **viewer**: Read-only access

### User Status
- **active**: Fully activated user account
- **inactive**: Deactivated user account
- **pending**: User invited but not yet activated

## API Endpoints

### User Management
- `GET /api/v1/users` - List users with pagination, filtering, and search
- `GET /api/v1/users/:id` - Get user details by ID
- `PUT /api/v1/users/:id` - Update user (name, role, status, profile)
- `DELETE /api/v1/users/:id` - Delete user account

### Profile Management
- `PUT /api/v1/users/:id/profile` - Update user profile information

### Invitation System
- `POST /api/v1/users/invite` - Create user invitation
- `POST /api/v1/users/activate` - Activate user account with invitation token

### Statistics & Maintenance
- `GET /api/v1/users/stats` - Get user statistics (counts by role/status)
- `POST /api/v1/users/cleanup` - Clean up expired invitations

## Key Features

### Invitation-Based Registration
- Secure token-based invitation system
- 7-day invitation expiration
- Email uniqueness validation
- Invitation tracking (who invited, when)

### Security Features
- Password hashing using SHA-256
- Account locking after 5 failed login attempts (30-minute lockout)
- Sensitive data (auth) excluded from API responses
- Invitation token validation and expiration

### Search & Filtering
- Search users by name or email
- Filter by role and status
- Paginated results with sorting
- Duplicate result deduplication in search

### Profile Management
- Flexible profile data structure
- Timezone support
- Custom preferences storage
- Avatar URL support

### Data Validation
- Comprehensive Zod schema validation
- Type-safe API definitions using ts-typed-api
- Strict TypeScript typing throughout

## Model Methods

### Core CRUD Operations
- `findById(id)` - Find user by ID
- `findByEmail(email)` - Find user by email
- `create(userData)` - Create new user
- `update(id, data)` - Update user data
- `delete(id)` - Delete user

### User-Specific Operations
- `createInvitation(userData, invitedBy)` - Create invitation
- `findByInvitationToken(token)` - Find user by invitation token
- `activateUser(token, authData)` - Activate user account
- `updateProfile(userId, profileData)` - Update user profile
- `updateStatus(userId, status)` - Update user status
- `updateRole(userId, role)` - Update user role

### Authentication Support
- `recordLogin(userId, successful)` - Record login attempt
- `isAccountLocked(user)` - Check if account is locked
- `hashPassword(password)` - Hash password (static method)

### Statistics & Maintenance
- `getActiveUsersCount()` - Count active users
- `getPendingInvitationsCount()` - Count pending invitations
- `cleanupExpiredInvitations()` - Remove expired invitations
- `findByRole(role)` - Find users by role
- `findByStatus(status)` - Find users by status

## Error Handling
- Comprehensive error responses with proper HTTP status codes
- Validation error details included in responses
- Duplicate email detection
- Invalid invitation token handling
- Account lockout detection

## Type Safety
- Full TypeScript implementation
- Zod schema validation for all API endpoints
- Type-safe database operations
- Proper date serialization for API responses

## Security Considerations
- Authentication data never exposed in API responses
- Invitation tokens are cryptographically secure (32-byte random)
- Account lockout mechanism prevents brute force attacks
- Email uniqueness enforced at model level

## Future Enhancements
- OAuth integration support
- Password reset functionality
- Email notification system
- Advanced role permissions
- User activity logging
- Multi-factor authentication support

## Files Created/Modified
- `backend/src/models/user.ts` - User model implementation
- `backend/src/api/definitions/user.ts` - API type definitions
- `backend/src/api/handlers/user.ts` - API request handlers
- `backend/src/models/index.ts` - Export user model
