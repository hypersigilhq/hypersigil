import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { PromptResponseSchema } from './prompt';

const JSONSchemaSchema: z.ZodType<any> = z.lazy(() => z.object({
    type: z.enum(['object', 'array', 'string', 'number', 'boolean', 'null']),
    properties: z.record(z.string(), JSONSchemaSchema).optional(),
    items: JSONSchemaSchema.optional(),
    required: z.array(z.string()).optional(),
    description: z.string().optional(),
    enum: z.array(z.any()).optional(),
    format: z.string().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    additionalProperties: z.union([z.boolean(), JSONSchemaSchema]).optional()
}).catchall(z.any()));

const ExecutionOptionsSchema = z.object({
    schema: JSONSchemaSchema.optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).optional()
}).catchall(z.any());

export const ExecutionResponseSchema = z.object({
    id: z.string(),
    prompt_id: z.string(),
    prompt: PromptResponseSchema.optional(),
    user_input: z.string(),
    provider: z.string(),
    model: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    result: z.string().optional(),
    error_message: z.string().optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    options: ExecutionOptionsSchema.optional()
})

export type ExecutionResponseSchema = z.infer<typeof ExecutionResponseSchema>

const CreateExecutionRequestSchema = z.object({
    promptId: z.string().uuid(),
    userInput: z.string().min(1),
    providerModel: z.string().regex(/^[a-zA-Z0-9_-]+:.+$/, 'Must be in format provider:model'),
    options: ExecutionOptionsSchema.optional()
});

const PaginatedExecutionsResponseSchema = z.object({
    data: z.array(ExecutionResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
})

const ExecutionStatsResponseSchema = z.object({
    total: z.number(),
    pending: z.number(),
    running: z.number(),
    completed: z.number(),
    failed: z.number(),
    byProvider: z.record(z.string(), z.number())
});

const ProviderHealthResponseSchema = z.record(z.string(), z.object({
    available: z.boolean(),
    models: z.array(z.string()),
    version: z.string().optional(),
    error: z.string().optional()
}));

const QueueStatusResponseSchema = z.object({
    processing: z.number(),
    queuedIds: z.array(z.string())
});

const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.any().optional()
});

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
                query: z.object({
                    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional().default('1'),
                    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional().default('10'),
                    status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
                    provider: z.string().optional(),
                    promptId: z.string().uuid().optional(),
                    orderBy: z.enum(['created_at', 'updated_at', 'started_at', 'completed_at']).optional().default('created_at'),
                    orderDirection: z.enum(['ASC', 'DESC']).optional().default('DESC')
                }),
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
                params: z.object({
                    id: z.string().uuid()
                }),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: ExecutionResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            // DELETE /api/v1/executions/:id - Cancel a pending execution
            cancel: {
                method: 'DELETE',
                path: '/:id',
                params: z.object({
                    id: z.string().uuid()
                }),
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
                    200: z.array(z.string()),
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
                    200: z.record(z.string(), z.array(z.string())),
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
