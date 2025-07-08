import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';

// Prompt response schema
const PromptResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    prompt: z.string(),
    json_schema_response: z.object({}).passthrough(),
    created_at: z.string(),
    updated_at: z.string()
});

// Create prompt request schema
const CreatePromptRequestSchema = z.object({
    name: z.string().min(1).max(255),
    prompt: z.string().min(1),
    json_schema_response: z.object({}).passthrough()
});

// Update prompt request schema
const UpdatePromptRequestSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    prompt: z.string().min(1).optional(),
    json_schema_response: z.object({}).passthrough().optional()
});

// Pagination response schema
const PaginatedPromptsResponseSchema = z.object({
    data: z.array(PromptResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
});

// Error response schema
const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.any().optional()
});

export const PromptApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/prompts',
    endpoints: {
        prompts: {
            // GET /api/v1/prompts - List prompts with pagination and search
            list: {
                method: 'GET',
                path: '/',
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

            // POST /api/v1/prompts - Create a new prompt
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

            // GET /api/v1/prompts/:id - Get a specific prompt
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

            // PUT /api/v1/prompts/:id - Update a specific prompt
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

            // DELETE /api/v1/prompts/:id - Delete a specific prompt
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

            // GET /api/v1/prompts/search/:pattern - Search prompts by name pattern
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

            // GET /api/v1/prompts/recent - Get recent prompts
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

// Export types for use in components
export type PromptResponse = z.infer<typeof PromptResponseSchema>;
export type CreatePromptRequest = z.infer<typeof CreatePromptRequestSchema>;
export type UpdatePromptRequest = z.infer<typeof UpdatePromptRequestSchema>;
export type PaginatedPromptsResponse = z.infer<typeof PaginatedPromptsResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
