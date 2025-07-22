import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';

// JSON Schema validation - improved type safety
const JSONSchemaSchema: z.ZodType<Record<string, unknown>> = z.record(z.unknown());

// Prompt version schema
export const PromptVersionSchema = z.object({
    version: z.number(),
    name: z.string(),
    prompt: z.string(),
    json_schema_response: JSONSchemaSchema.optional(),
    json_schema_input: JSONSchemaSchema.optional(),
    created_at: z.string()
});

export type PromptVersion = z.infer<typeof PromptVersionSchema>;

// Response schemas
export const PromptResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    prompt: z.string(),
    json_schema_response: JSONSchemaSchema.optional(),
    json_schema_input: JSONSchemaSchema.optional(),
    current_version: z.number(),
    versions: z.array(PromptVersionSchema),
    created_at: z.string(),
    updated_at: z.string()
});

export type PromptResponse = z.infer<typeof PromptResponseSchema>;

// Request schemas
export const CreatePromptRequestSchema = z.object({
    name: z.string().min(1).max(255),
    prompt: z.string().min(1),
    json_schema_response: JSONSchemaSchema.optional(),
    json_schema_input: JSONSchemaSchema.optional(),
});

export type CreatePromptRequest = z.infer<typeof CreatePromptRequestSchema>;

export const UpdatePromptRequestSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    prompt: z.string().min(1).optional(),
    json_schema_response: JSONSchemaSchema.optional(),
    json_schema_input: JSONSchemaSchema.optional()
});

export type UpdatePromptRequest = z.infer<typeof UpdatePromptRequestSchema>;

// Paginated response schema
export const PaginatedPromptsResponseSchema = createPaginationResponseSchema(PromptResponseSchema);

export type PaginatedPromptsResponse = z.infer<typeof PaginatedPromptsResponseSchema>;

// Query schemas
export const PromptListQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
    orderBy: z.enum(['name', 'created_at', 'updated_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type PromptListQuery = z.infer<typeof PromptListQuerySchema>;

export const PromptRecentQuerySchema = z.object({
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(50)).optional().default('10')
});

export type PromptRecentQuery = z.infer<typeof PromptRecentQuerySchema>;

// Parameter schemas
export const PromptParamsSchema = z.object({
    id: z.string().uuid()
});

export type PromptParams = z.infer<typeof PromptParamsSchema>;

export const PromptSearchParamsSchema = z.object({
    pattern: z.string().min(1)
});

export type PromptSearchParams = z.infer<typeof PromptSearchParamsSchema>;

// Select list schema for dropdowns
export const PromptSelectListSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        name: z.string(),
    }))
});

export type PromptSelectListResponse = z.infer<typeof PromptSelectListSchema>;

// Prompt adjustment schemas
export const GenerateAdjustmentRequestSchema = z.object({
    commentIds: z.array(z.string().uuid()),
    summarize: z.boolean().optional()
});

export type GenerateAdjustmentRequest = z.infer<typeof GenerateAdjustmentRequestSchema>;

export const GenerateAdjustmentResponseSchema = z.object({
    adjustmentPrompt: z.string(),
    originalPrompt: z.string(),
    commentsProcessed: z.number()
});

export type GenerateAdjustmentResponse = z.infer<typeof GenerateAdjustmentResponseSchema>;

export const PromptApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/prompts',
    endpoints: {
        prompts: {
            selectList: {
                method: 'GET',
                path: '/select-list',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: PromptSelectListSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                }),
            },
            list: {
                method: 'GET',
                path: '/',
                params: z.object({}),
                query: PromptListQuerySchema,
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
                params: PromptParamsSchema,
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
                params: PromptParamsSchema,
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
                params: PromptParamsSchema,
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
                params: PromptSearchParamsSchema,
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
                query: PromptRecentQuerySchema,
                body: z.object({}),
                responses: CreateResponses({
                    200: z.array(PromptResponseSchema),
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            generateAdjustment: {
                method: 'POST',
                path: '/:id/generate-adjustment',
                params: PromptParamsSchema,
                query: z.object({}),
                body: GenerateAdjustmentRequestSchema,
                responses: CreateResponses({
                    200: GenerateAdjustmentResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
