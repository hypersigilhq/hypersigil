import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { PromptResponseSchema } from './prompt';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';

// JSON Schema validation - improved type safety
const JSONSchemaSchema: z.ZodType<Record<string, unknown>> = z.lazy(() => z.object({
    type: z.enum(['object', 'array', 'string', 'number', 'boolean', 'null']),
    properties: z.record(z.string(), JSONSchemaSchema).optional(),
    items: JSONSchemaSchema.optional(),
    required: z.array(z.string()).optional(),
    description: z.string().optional(),
    enum: z.array(z.unknown()).optional(),
    format: z.string().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    additionalProperties: z.union([z.boolean(), JSONSchemaSchema]).optional()
}).catchall(z.unknown()));

// Execution options schema
export const ExecutionOptionsSchema = z.object({
    schema: JSONSchemaSchema.optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).optional()
}).catchall(z.unknown());

export type ExecutionOptions = z.infer<typeof ExecutionOptionsSchema>;

// Execution status enum
export const ExecutionStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

// Response schemas
export const ExecutionResponseSchema = z.object({
    id: z.string(),
    prompt_id: z.string(),
    prompt_version: z.number(),
    prompt: z.object({ name: z.string(), version: z.number() }).optional(),
    user_input: z.string(),
    provider: z.string(),
    model: z.string(),
    status: ExecutionStatusSchema,
    result: z.string().optional(),
    error_message: z.string().optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    options: ExecutionOptionsSchema.optional()
});

export type ExecutionResponse = z.infer<typeof ExecutionResponseSchema>;

// Request schemas
export const CreateExecutionRequestSchema = z.object({
    promptId: z.string().uuid(),
    promptVersion: z.number().optional(),
    userInput: z.string().min(1),
    providerModel: z.string().regex(/^[a-zA-Z0-9_-]+:.+$/, 'Must be in format provider:model'),
    options: ExecutionOptionsSchema.optional()
});

export type CreateExecutionRequest = z.infer<typeof CreateExecutionRequestSchema>;

// Paginated response schema
export const PaginatedExecutionsResponseSchema = createPaginationResponseSchema(ExecutionResponseSchema);

export type PaginatedExecutionsResponse = z.infer<typeof PaginatedExecutionsResponseSchema>;

// Stats response schema
export const ExecutionStatsResponseSchema = z.object({
    total: z.number(),
    pending: z.number(),
    running: z.number(),
    completed: z.number(),
    failed: z.number(),
    byProvider: z.record(z.string(), z.number())
});

export type ExecutionStatsResponse = z.infer<typeof ExecutionStatsResponseSchema>;

// Provider health response schema
export const ProviderHealthResponseSchema = z.record(z.string(), z.object({
    available: z.boolean(),
    models: z.array(z.string()),
    version: z.string().optional(),
    error: z.string().optional()
}));

export type ProviderHealthResponse = z.infer<typeof ProviderHealthResponseSchema>;

// Queue status response schema
export const QueueStatusResponseSchema = z.object({
    processing: z.number(),
});

export type QueueStatusResponse = z.infer<typeof QueueStatusResponseSchema>;

// Provider models response schema
export const ProviderModelsResponseSchema = z.record(z.string(), z.array(z.string()));

export type ProviderModelsResponse = z.infer<typeof ProviderModelsResponseSchema>;

// Providers list response schema
export const ProvidersListResponseSchema = z.array(z.string());

export type ProvidersListResponse = z.infer<typeof ProvidersListResponseSchema>;

// Query schemas
export const ExecutionListQuerySchema = PaginationQuerySchema.extend({
    status: ExecutionStatusSchema.optional(),
    provider: z.string().optional(),
    promptId: z.string().uuid().optional(),
    orderBy: z.enum(['created_at', 'updated_at', 'started_at', 'completed_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type ExecutionListQuery = z.infer<typeof ExecutionListQuerySchema>;

// Parameter schemas
export const ExecutionParamsSchema = z.object({
    id: z.string().uuid()
});

export type ExecutionParams = z.infer<typeof ExecutionParamsSchema>;

export const ExecutionApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/executions',
    endpoints: {
        executions: {
            create: {
                method: 'POST',
                path: '/',
                params: z.object({}),
                query: z.object({}),
                body: CreateExecutionRequestSchema,
                responses: CreateResponses({
                    201: ExecutionResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },
            list: {
                method: 'GET',
                path: '/',
                params: z.object({}),
                query: ExecutionListQuerySchema,
                body: z.object({}),
                responses: CreateResponses({
                    200: PaginatedExecutionsResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/:id',
                params: ExecutionParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: ExecutionResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            cancel: {
                method: 'DELETE',
                path: '/:id',
                params: ExecutionParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    204: z.object({}),
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getStats: {
                method: 'GET',
                path: '/stats/all',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: ExecutionStatsResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getQueueStatus: {
                method: 'GET',
                path: '/queue/status',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: QueueStatusResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        },

        providers: {
            getProviderHealth: {
                method: 'GET',
                path: '/providers/health',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: ProviderHealthResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            listProviders: {
                method: 'GET',
                path: '/providers/list',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: ProvidersListResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getAvailableModels: {
                method: 'GET',
                path: '/providers/models',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: ProviderModelsResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
