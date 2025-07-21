# User Invitation System

## Overview
Implemented a comprehensive user invitation system that allows administrators to invite new users to the platform via a dialog interface. The system generates invitation links that users can use to set up their own passwords.

## Features Implemented

### 1. User Invitation Dialog (`CreateUserDialog.vue`)
- **Two-phase dialog interface**:
  - Phase 1: User creation form with email, name, and role fields
  - Phase 2: Success screen with copyable invitation link
- **Form validation**: Client-side validation with proper error handling
- **Role selection**: Dropdown with Admin, User, and Viewer options
- **Loading states**: Proper loading indicators during API calls
- **Error handling**: User-friendly error messages

### 2. Integration with Users Table
- **"Invite User" button**: Added to the header section of UsersTable
- **Automatic refresh**: Users list refreshes after successful invitation
- **Seamless UX**: Dialog opens/closes smoothly with proper state management

### 3. API Integration
- **Enhanced userApi**: Added `invite` method to API client
- **Type safety**: Uses existing API definitions and Zod schemas
- **Proper error handling**: Comprehensive error handling with user feedback

### 4. Invitation Link Generation
- **Dynamic URL construction**: Uses router configuration for invitation setup
- **Copy-to-clipboard functionality**: One-click copying with visual feedback
- **Secure token handling**: Uses backend-generated invitation tokens

## Technical Implementation

### API Client Enhancement
```typescript
// Added to ui/src/services/api-client.ts
invite: (body: { email: string; name: string; role: 'admin' | 'user' | 'viewer'; profile?: any }) =>
    userApiClient.callApi('users', 'invite', { body }, {
        201: (payload) => payload.data,
        400: (payload) => { throw new Error(payload.data?.error || 'Bad request'); },
        500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
        422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
    })
```

### Dialog Component Structure
- **Vue 3 Composition API**: Modern reactive state management
- **TypeScript integration**: Full type safety with API definitions
- **Component separation**: Clean separation of concerns
- **Reusable patterns**: Follows established dialog patterns in the codebase

### Invitation URL Format
```
${window.location.origin}/auth/invitation/${invitation_token}
```

## User Experience Flow

1. **Administrator clicks "Invite User"** → Opens invitation dialog
2. **Fills in user details** → Email, name, and role selection
3. **Submits invitation** → API call creates user and generates token
4. **Success screen displays** → Shows invitation link with copy functionality
5. **Administrator shares link** → Invited user receives invitation URL
6. **User clicks link** → Redirects to invitation setup page
7. **User sets password** → Completes registration process

## UI/UX Features

### Design Consistency
- **Follows existing patterns**: Uses same UI components (shadcn/ui)
- **Consistent styling**: Matches PromptsTable and other components
- **Proper spacing**: Consistent typography and color scheme

### Accessibility
- **ARIA labels**: Proper accessibility attributes
- **Keyboard navigation**: Full keyboard support
- **Screen reader compatibility**: Semantic HTML structure

### Form Validation
- **Real-time validation**: Immediate feedback on form inputs
- **Required field indicators**: Clear visual cues
- **Error message display**: User-friendly error messages

### Success Feedback
- **Visual confirmation**: Green success banner with checkmark
- **User details display**: Shows invited user's name, email, and role
- **Copy functionality**: One-click invitation link copying
- **Clear instructions**: Guidance on next steps

## Security Considerations

### Token-based Invitations
- **Secure token generation**: Backend generates cryptographically secure tokens
- **Expiration handling**: Tokens have expiration dates
- **One-time use**: Tokens are invalidated after use

### Role-based Access
- **Admin-only feature**: Only administrators can invite users
- **Role assignment**: Clear role selection with proper validation
- **Permission inheritance**: Invited users inherit assigned role permissions

## Integration Points

### Router Integration
- **Invitation setup route**: `/auth/invitation/:token`
- **Proper navigation guards**: Authentication checks
- **Token parameter handling**: Automatic token extraction

### State Management
- **Reactive updates**: Users table refreshes automatically
- **Dialog state**: Proper open/close state management
- **Error state handling**: Comprehensive error state management

## Future Enhancements

### Potential Improvements
- **Bulk invitations**: Support for inviting multiple users at once
- **Email notifications**: Automatic email sending with invitation links
- **Invitation management**: View and manage pending invitations
- **Custom invitation messages**: Personalized invitation messages
- **Invitation analytics**: Track invitation success rates

### Technical Debt
- **Toast notifications**: Could add toast notifications for better UX
- **Invitation expiry display**: Show expiration dates in UI
- **Resend functionality**: Allow resending expired invitations

## Testing Considerations

### Manual Testing Checklist
- [ ] Dialog opens and closes properly
- [ ] Form validation works correctly
- [ ] API calls succeed and fail gracefully
- [ ] Invitation links are generated correctly
- [ ] Copy-to-clipboard functionality works
- [ ] Users table refreshes after invitation
- [ ] Error states display properly
- [ ] Loading states work correctly

### Edge Cases Handled
- **Duplicate email addresses**: Backend validation prevents duplicates
- **Network errors**: Proper error handling and user feedback
- **Invalid form data**: Client-side validation prevents submission
- **Dialog state management**: Proper cleanup on close/cancel

## Dependencies

### UI Components Used
- `Dialog`, `DialogContent`, `DialogHeader`, etc.
- `Button`, `Input`, `Label`, `Select`
- `CopyToClipboard` component
- `CheckCircle` icon from Lucide

### API Dependencies
- `userApi.invite()` method
- `CreateUserInvitationResponse` type
- `UserRole` type from API definitions

This implementation provides a complete, user-friendly invitation system that integrates seamlessly with the existing user management infrastructure while maintaining high standards for security, accessibility, and user experience.
