import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema } from './common';
import { PublicUserSchema } from './user';

// Authentication request schemas
export const RegisterFirstAdminRequestSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(8)
});

export type RegisterFirstAdminRequest = z.infer<typeof RegisterFirstAdminRequestSchema>;

export const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Authentication response schemas
export const AuthResponseSchema = z.object({
    token: z.string(),
    user: PublicUserSchema.omit({ created_at: true, updated_at: true })
});

const LoginUser = z.object({
    email: z.string(),
    name: z.string(),
    role: z.string()
})

export const AuthLoginResponseSchema = z.object({
    token: z.string(),
    user: LoginUser
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;

export const MeResponseSchema = PublicUserSchema;

export type MeResponse = z.infer<typeof MeResponseSchema>;

export const CheckResponseSchema = z.object({
    shouldRedirectToRegisterFirstAdmin: z.boolean(),
});

export type CheckResponse = z.infer<typeof CheckResponseSchema>;

export const activateUserBodySchema = z.object({
    invitation_token: z.string(),
    password: z.string().min(8).optional() // For future auth implementation
});
export const activateUserResponseSchema = LoginUser;

export type ActivateUserBody = z.infer<typeof activateUserBodySchema>;
export type ActivateUserResponse = z.infer<typeof activateUserResponseSchema>;

export const AuthApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/auth',
    endpoints: {
        auth: {
            registerFirstAdmin: {
                method: 'POST',
                path: '/register-first-admin',
                body: RegisterFirstAdminRequestSchema,
                responses: CreateResponses({
                    201: AuthLoginResponseSchema,
                    400: ErrorResponseSchema,
                    409: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            login: {
                method: 'POST',
                path: '/login',
                body: LoginRequestSchema,
                responses: CreateResponses({
                    200: AuthLoginResponseSchema,
                    400: ErrorResponseSchema,
                    401: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            check: {
                method: 'GET',
                path: '/check',
                responses: CreateResponses({
                    200: CheckResponseSchema,
                    500: ErrorResponseSchema
                })
            },


            activate: {
                method: 'POST',
                path: '/activate',
                body: activateUserBodySchema,
                responses: CreateResponses({
                    200: activateUserResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },
        }
    }
});
