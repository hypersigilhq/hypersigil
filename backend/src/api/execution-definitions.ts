import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api';

// JSON Schema definition for structured responses
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

// Execution options schema
const ExecutionOptionsSchema = z.object({
    schema: JSONSchemaSchema.optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).optional()
}).catchall(z.any());

// Execution response schema
const ExecutionResponseSchema = z.object({
    id: z.string(),
    prompt_id: z.string(),
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
});

// Create execution request schema
const CreateExecutionRequestSchema = z.object({
    promptId: z.string().uuid(),
    userInput: z.string().min(1),
    providerModel: z.string().regex(/^[a-zA-Z0-9_-]+:.+$/, 'Must be in format provider:model'),
    options: ExecutionOptionsSchema.optional()
});

// Pagination response schema for executions
const PaginatedExecutionsResponseSchema = z.object({
    data: z.array(ExecutionResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
});

// Execution statistics schema
const ExecutionStatsResponseSchema = z.object({
    total: z.number(),
    pending: z.number(),
    running: z.number(),
    completed: z.number(),
    failed: z.number(),
    byProvider: z.record(z.string(), z.number())
});

// Provider health schema
const ProviderHealthResponseSchema = z.record(z.string(), z.object({
    available: z.boolean(),
    models: z.array(z.string()),
    version: z.string().optional(),
    error: z.string().optional()
}));

// Queue status schema
const QueueStatusResponseSchema = z.object({
    processing: z.number(),
    queuedIds: z.array(z.string())
});

// Error response schema
const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.any().optional()
});

export const ExecutionApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/executions',
    endpoints: {
        executions: {
            // POST /api/v1/executions - Create a new execution
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

            // GET /api/v1/executions - List executions with pagination and filtering
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

            // GET /api/v1/executions/:id - Get a specific execution
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

            // GET /api/v1/executions/stats - Get execution statistics
            getStats: {
                method: 'GET',
                path: '/stats',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: ExecutionStatsResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            // GET /api/v1/executions/queue/status - Get queue processing status
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
            // GET /api/v1/executions/providers/health - Get provider health status
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

            // GET /api/v1/executions/providers - List available providers
            listProviders: {
                method: 'GET',
                path: '/providers',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: z.array(z.string()),
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
