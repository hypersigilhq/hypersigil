import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema } from './common';

export const permissions = z.enum([
    'executions:run', 'executions:read',
    'prompts:preview', 'prompts:read',
    'files:upload'
])

// API Key schemas
export const ApiKeySchema = z.object({
    id: z.string(),
    name: z.string(),
    key_prefix: z.string(),
    user_id: z.string(),
    permissions: z.object({
        scopes: z.array(permissions)
    }),
    status: z.enum(['active', 'revoked']),
    usage_stats: z.object({
        total_requests: z.number(),
        last_used_at: z.string().optional(),
        last_ip: z.string().optional()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

export const PublicApiKeySchema = ApiKeySchema.omit({ user_id: true });

export type ApiKey = z.infer<typeof ApiKeySchema>;
export type PublicApiKey = z.infer<typeof PublicApiKeySchema>;

// Request schemas
export const CreateApiKeyRequestSchema = z.object({
    name: z.string().min(1).max(100),
    scopes: z.array(permissions)
});

export const UpdateApiKeyRequestSchema = z.object({
    name: z.string().min(1).max(100)
});

export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;
export type UpdateApiKeyRequest = z.infer<typeof UpdateApiKeyRequestSchema>;

// Response schemas
export const CreateApiKeyResponseSchema = z.object({
    api_key: PublicApiKeySchema,
    plain_key: z.string()
});

export const ListApiKeysResponseSchema = z.object({
    api_keys: z.array(PublicApiKeySchema)
});

export const ApiKeyStatsResponseSchema = z.object({
    total_keys: z.number(),
    active_keys: z.number(),
    revoked_keys: z.number(),
    total_requests: z.number()
});

export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;
export type ListApiKeysResponse = z.infer<typeof ListApiKeysResponseSchema>;
export type ApiKeyStatsResponse = z.infer<typeof ApiKeyStatsResponseSchema>;

// API Definition
export const ApiKeyApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/api-keys',
    endpoints: {
        apiKeys: {
            list: {
                method: 'GET',
                path: '/',
                responses: CreateResponses({
                    200: ListApiKeysResponseSchema,
                    401: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            create: {
                method: 'POST',
                path: '/',
                body: CreateApiKeyRequestSchema,
                responses: CreateResponses({
                    201: CreateApiKeyResponseSchema,
                    400: ErrorResponseSchema,
                    401: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            get: {
                method: 'GET',
                path: '/:id',
                params: z.object({
                    id: z.string()
                }),
                responses: CreateResponses({
                    200: PublicApiKeySchema,
                    401: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'PUT',
                path: '/:id',
                params: z.object({
                    id: z.string()
                }),
                body: UpdateApiKeyRequestSchema,
                responses: CreateResponses({
                    200: PublicApiKeySchema,
                    400: ErrorResponseSchema,
                    401: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            revoke: {
                method: 'DELETE',
                path: '/:id',
                params: z.object({
                    id: z.string()
                }),
                responses: CreateResponses({
                    200: PublicApiKeySchema,
                    401: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            stats: {
                method: 'GET',
                path: '/stats',
                responses: CreateResponses({
                    200: ApiKeyStatsResponseSchema,
                    401: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
