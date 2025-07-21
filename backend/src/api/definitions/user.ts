import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { PaginationQuerySchema, createPaginationResponseSchema, ErrorResponseSchema } from './common';

// User role enum
export const UserRoleSchema = z.enum(['admin', 'user', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// User status enum
export const UserStatusSchema = z.enum(['active', 'inactive', 'pending']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

// User profile schema
export const UserProfileSchema = z.object({
    timezone: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// User auth schema (for internal use)
export const UserAuthSchema = z.object({
    password_hash: z.string().optional(),
    last_login: z.date().optional(),
    login_attempts: z.number().optional(),
    locked_until: z.date().optional()
});
export type UserAuth = z.infer<typeof UserAuthSchema>;

// User invitation schema
export const UserInvitationSchema = z.object({
    token: z.string().optional(),
    expires_at: z.string().optional(),
    invited_by: z.string().optional(),
    invited_at: z.string().optional()
});
export type UserInvitation = z.infer<typeof UserInvitationSchema>;

// Base user schema (full document)
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleSchema,
    status: UserStatusSchema,
    profile: UserProfileSchema.optional(),
    auth: UserAuthSchema.optional(),
    invitation: UserInvitationSchema.optional(),
    created_at: z.string(),
    updated_at: z.string()
});
export type User = z.infer<typeof UserSchema>;

// Public user schema (without sensitive data)
export const PublicUserSchema = UserSchema.omit({ auth: true });
export type PublicUser = z.infer<typeof PublicUserSchema>;

// User summary schema (for lists)
export const UserSummarySchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleSchema,
    status: UserStatusSchema,
    profile: z.object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        avatar_url: z.string().url().optional()
    }).optional(),
    last_login: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const listUsersQuerySchema = PaginationQuerySchema.extend({
    role: UserRoleSchema.optional(),
    status: UserStatusSchema.optional(),
    search: z.string().optional() // Search by name or email
});
export const listUsersResponseSchema = createPaginationResponseSchema(UserSummarySchema);

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;

export const getUserParamsSchema = z.object({
    id: z.string()
});
export const getUserResponseSchema = PublicUserSchema;

export type GetUserParams = z.infer<typeof getUserParamsSchema>;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

export const createUserInvitationBodySchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: UserRoleSchema,
    profile: UserProfileSchema.optional()
});
export const createUserInvitationResponseSchema = z.object({
    user: PublicUserSchema,
    invitation_token: z.string()
});

export type CreateUserInvitationBody = z.infer<typeof createUserInvitationBodySchema>;
export type CreateUserInvitationResponse = z.infer<typeof createUserInvitationResponseSchema>;

export const updateUserParamsSchema = z.object({
    id: z.string()
});
export const updateUserBodySchema = z.object({
    name: z.string().min(1).optional(),
    role: UserRoleSchema.optional(),
    status: UserStatusSchema.optional(),
    profile: UserProfileSchema.optional()
});
export const updateUserResponseSchema = PublicUserSchema;

export type UpdateUserParams = z.infer<typeof updateUserParamsSchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;

export const updateUserProfileParamsSchema = z.object({
    id: z.string()
});
export const updateUserProfileBodySchema = UserProfileSchema;
export const updateUserProfileResponseSchema = PublicUserSchema;

export type UpdateUserProfileParams = z.infer<typeof updateUserProfileParamsSchema>;
export type UpdateUserProfileBody = z.infer<typeof updateUserProfileBodySchema>;
export type UpdateUserProfileResponse = z.infer<typeof updateUserProfileResponseSchema>;

export const deleteUserParamsSchema = z.object({
    id: z.string()
});
export const deleteUserResponseSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

export type DeleteUserParams = z.infer<typeof deleteUserParamsSchema>;
export type DeleteUserResponse = z.infer<typeof deleteUserResponseSchema>;

export const getUserStatsResponseSchema = z.object({
    total_users: z.number(),
    active_users: z.number(),
    inactive_users: z.number(),
    pending_invitations: z.number(),
    users_by_role: z.object({
        admin: z.number(),
        user: z.number(),
        viewer: z.number()
    })
});

export type GetUserStatsResponse = z.infer<typeof getUserStatsResponseSchema>;

export const cleanupExpiredInvitationsResponseSchema = z.object({
    deleted_count: z.number(),
    message: z.string()
});

export type CleanupExpiredInvitationsResponse = z.infer<typeof cleanupExpiredInvitationsResponseSchema>;


const LoginUser = z.object({
    email: z.string(),
    name: z.string(),
    role: z.string()
})


export const UserApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/users',
    endpoints: {
        users: {
            list: {
                method: 'GET',
                path: '/',
                params: z.object({}),
                query: listUsersQuerySchema,
                body: z.object({}),
                responses: CreateResponses({
                    200: listUsersResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/:id',
                params: getUserParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: getUserResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            invite: {
                method: 'POST',
                path: '/invite',
                params: z.object({}),
                query: z.object({}),
                body: createUserInvitationBodySchema,
                responses: CreateResponses({
                    201: createUserInvitationResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'PUT',
                path: '/:id',
                params: updateUserParamsSchema,
                query: z.object({}),
                body: updateUserBodySchema,
                responses: CreateResponses({
                    200: updateUserResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            updateProfile: {
                method: 'PUT',
                path: '/:id/profile',
                params: updateUserProfileParamsSchema,
                query: z.object({}),
                body: updateUserProfileBodySchema,
                responses: CreateResponses({
                    200: updateUserProfileResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/:id',
                params: deleteUserParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: deleteUserResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            cleanup: {
                method: 'POST',
                path: '/cleanup',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: cleanupExpiredInvitationsResponseSchema,
                    500: ErrorResponseSchema
                })
            },
            me: {
                method: 'GET',
                path: '/profile/me',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: LoginUser,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
