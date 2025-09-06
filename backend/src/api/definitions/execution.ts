import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';
import { JSONSchemaSchema } from './prompt';

// copy of base-provider AIProviderNames, leave it here as is since this file cannot import from outside of this dir
export const AIProviderNamesDefinition = ['ollama', 'openai', 'anthropic', 'gemini'] as const
export type AIProviderNameDefinition = typeof AIProviderNamesDefinition[number]

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
    prompt_id: z.string().optional(),
    prompt_version: z.number().optional(),
    prompt_text: z.string().optional(),
    prompt: z.object({ name: z.string(), version: z.number() }).optional(),
    test_data_group_id: z.string().optional(),
    test_data_item_id: z.string().optional(),
    user_input: z.string(),
    provider: z.enum(AIProviderNamesDefinition),
    model: z.string(),
    status: ExecutionStatusSchema,
    result: z.string().optional(),
    result_valid: z.boolean().optional(),
    result_validation_message: z.string().optional(),
    input_tokens_used: z.number().optional(),
    output_tokens_used: z.number().optional(),
    error_message: z.string().optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    traceId: z.string().optional(),
    origin: z.enum(['app', 'api']),
    starred: z.boolean().optional(),
    fileId: z.string().optional(),
    options: ExecutionOptionsSchema.optional()
}).refine(input => {
    return input.prompt_id || input.prompt_text
}, { message: "Missing prompt_id and prompt_text" });

export type ExecutionResponse = z.infer<typeof ExecutionResponseSchema>;


export const CreateExecutionResponseSchema = z.object({
    executionIds: z.array(z.string())
});

export type CreateExecutionResponse = z.infer<typeof CreateExecutionResponseSchema>;

// Request schemas
export const CreateExecutionRequestSchema = z.object({
    promptId: z.string().uuid().optional(),
    promptVersion: z.number().optional(),
    promptText: z.string().optional(),
    userInput: z.string().optional(),
    testDataGroupId: z.string().optional(),
    traceId: z.string().optional(),
    providerModel: z.array(z.string().regex(/^[a-zA-Z0-9_-]+:.+$/, 'Must be in format provider:model')),
    options: ExecutionOptionsSchema.optional(),
    fileId: z.string().optional()
}).superRefine((val, ctx) => {
    if (!val.promptId && !val.promptText) {
        ctx.addIssue({ message: 'promptId or promptText is required', code: 'custom' })
    }
    if (val.promptId && !val.testDataGroupId && !val.userInput) {
        ctx.addIssue({ message: 'userInput or testDataGroupId is required', code: 'custom' })
    }
})

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
    byProvider: z.record(z.enum(AIProviderNamesDefinition), z.number().or(z.undefined()))
});

export type ExecutionStatsResponse = z.infer<typeof ExecutionStatsResponseSchema>;

// Provider health response schema
export const ProviderHealthResponseSchema = z.record(z.string(), z.object({
    available: z.boolean(),
    models: z.array(z.string()),
    version: z.string().optional(),
    error: z.string().optional(),
    supportsFileUpload: z.boolean(),
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
    provider: z.enum(AIProviderNamesDefinition).optional(),
    promptId: z.string().uuid().optional(),
    starred: z.boolean().optional(),
    ids: z.string().optional().transform(v => v?.split(',')),
    orderBy: z.enum(['created_at', 'updated_at', 'started_at', 'completed_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC'),
    downloadCsv: z.boolean().optional()
});

export type ExecutionListQuery = z.infer<typeof ExecutionListQuerySchema>;

// Parameter schemas
export const ExecutionParamsSchema = z.object({
    id: z.string().uuid()
});

export type ExecutionParams = z.infer<typeof ExecutionParamsSchema>;

export const ExecutionUpdateRequestSchema = z.object({
    starred: z.boolean().optional(),
    userStatus: z.string().optional()
})
export type ExecutionUpdateRequest = z.infer<typeof ExecutionUpdateRequestSchema>;

export const ExecutionAvailableModelsQuerySchema = z.object({
    supportsFileUpload: z.boolean().optional()
})

export type ExecutionAvailableModelsQueryRequest = z.infer<typeof ExecutionAvailableModelsQuerySchema>;

export const ExecutionApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/executions',
    endpoints: {
        executions: {
            create: {
                method: 'POST',
                path: '/',
                body: CreateExecutionRequestSchema,
                responses: CreateResponses({
                    201: CreateExecutionResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },
            list: {
                method: 'GET',
                path: '/',
                query: ExecutionListQuerySchema,
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
                responses: CreateResponses({
                    200: ExecutionResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'POST',
                path: '/update-fields/:id',
                params: ExecutionParamsSchema,
                body: ExecutionUpdateRequestSchema,
                responses: CreateResponses({
                    201: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            cancel: {
                method: 'DELETE',
                path: '/:id',
                params: ExecutionParamsSchema,
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
                responses: CreateResponses({
                    200: ExecutionStatsResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        },

        providers: {
            getProviderHealth: {
                method: 'GET',
                path: '/providers/health',
                responses: CreateResponses({
                    200: ProviderHealthResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            listProviders: {
                method: 'GET',
                path: '/providers/list',
                responses: CreateResponses({
                    200: ProvidersListResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getAvailableModels: {
                method: 'GET',
                path: '/providers/models',
                query: ExecutionAvailableModelsQuerySchema,
                responses: CreateResponses({
                    200: ProviderModelsResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
