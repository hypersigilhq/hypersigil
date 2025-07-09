import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';

export const PromptResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    prompt: z.string(),
    json_schema_response: z.object({}).passthrough(),
    created_at: z.string(),
    updated_at: z.string()
});
export type PromptResponseSchema = z.infer<typeof PromptResponseSchema>;

export const CreatePromptRequestSchema = z.object({
    name: z.string().min(1).max(255),
    prompt: z.string().min(1),
    json_schema_response: z.object({}).passthrough()
});

export const UpdatePromptRequestSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    prompt: z.string().min(1).optional(),
    json_schema_response: z.object({}).passthrough().optional()
});

export const PaginatedPromptsResponseSchema = z.object({
    data: z.array(PromptResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
});

export const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.any().optional()
});

export type PromptResponse = z.infer<typeof PromptResponseSchema>;
export type CreatePromptRequest = z.infer<typeof CreatePromptRequestSchema>;
export type UpdatePromptRequest = z.infer<typeof UpdatePromptRequestSchema>;

export const PromptApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/prompts',
    endpoints: {
        prompts: {
            list: {
                method: 'GET',
                path: '/list/blahblah',
                params: z.object({}),
                query: z.object({
                    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional().default('1'),
                    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional().default('10'),
                    search: z.string().optional(),
                    orderBy: z.enum(['name', 'created_at', 'updated_at']).optional().default('created_at'),
                    orderDirection: z.enum(['ASC', 'DESC']).optional().default('DESC')
                }),
                body: z.object({}),
                responses: CreateResponses({
                    200: PaginatedPromptsResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            create: {
                method: 'POST',
                path: '/',
                params: z.object({}),
                query: z.object({}),
                body: CreatePromptRequestSchema,
                responses: CreateResponses({
                    201: PromptResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/:id',
                params: z.object({
                    id: z.string().uuid()
                }),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: PromptResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'PUT',
                path: '/:id',
                params: z.object({
                    id: z.string().uuid()
                }),
                query: z.object({}),
                body: UpdatePromptRequestSchema,
                responses: CreateResponses({
                    200: PromptResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/:id',
                params: z.object({
                    id: z.string().uuid()
                }),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    204: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            searchByName: {
                method: 'GET',
                path: '/search/:pattern',
                params: z.object({
                    pattern: z.string().min(1)
                }),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: z.array(PromptResponseSchema),
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getRecent: {
                method: 'GET',
                path: '/recent',
                params: z.object({}),
                query: z.object({
                    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(50)).optional().default('10')
                }),
                body: z.object({}),
                responses: CreateResponses({
                    200: z.array(PromptResponseSchema),
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
