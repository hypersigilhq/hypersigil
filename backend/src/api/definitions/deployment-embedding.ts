import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';

// Embedding models and input types from the worker
const EmbeddingModelsSchema = z.enum(['voyage-3-large', 'voyage-3.5', 'voyage-3.5-lite', 'voyage-code-3', 'voyage-finance-2', 'voyage-law-2']);
const EmbeddingInputTypeSchema = z.enum(['query', 'document']).nullable();

// Deployment embedding status
const DeploymentEmbeddingStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

// Embedding result schema
const VoyageAIEmbeddingsResultSchema = z.object({
    embeddings: z.array(z.array(z.number())),
    model: z.string(),
    totalTokens: z.number()
});

// Response schemas
export const DeploymentEmbeddingResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    model: EmbeddingModelsSchema,
    inputType: EmbeddingInputTypeSchema.optional(),
    webhookDestinationIds: z.array(z.string()).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

export type DeploymentEmbeddingResponse = z.infer<typeof DeploymentEmbeddingResponseSchema>;

// Request schemas
export const CreateDeploymentEmbeddingRequestSchema = z.object({
    name: z.string().min(1).max(255).regex(/^[a-z0-9-_]+$/, 'Name must be a valid slug (lowercase letters, numbers, hyphens, and underscores only)'),
    model: EmbeddingModelsSchema,
    inputType: EmbeddingInputTypeSchema.optional(),
    webhookDestinationIds: z.array(z.string()).optional()
});

export type CreateDeploymentEmbeddingRequest = z.infer<typeof CreateDeploymentEmbeddingRequestSchema>;

export const UpdateDeploymentEmbeddingRequestSchema = z.object({
    model: EmbeddingModelsSchema.optional(),
    inputType: EmbeddingInputTypeSchema.optional(),
    webhookDestinationIds: z.array(z.string()).optional()
});

export type UpdateDeploymentEmbeddingRequest = z.infer<typeof UpdateDeploymentEmbeddingRequestSchema>;

// Paginated response schema
export const PaginatedDeploymentEmbeddingsResponseSchema = createPaginationResponseSchema(DeploymentEmbeddingResponseSchema);

export type PaginatedDeploymentEmbeddingsResponse = z.infer<typeof PaginatedDeploymentEmbeddingsResponseSchema>;

// Query schemas
export const DeploymentEmbeddingListQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
    orderBy: z.enum(['name', 'model', 'status', 'created_at', 'updated_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type DeploymentEmbeddingListQuery = z.infer<typeof DeploymentEmbeddingListQuerySchema>;

// Parameter schemas
export const DeploymentEmbeddingParamsSchema = z.object({
    id: z.string().uuid()
});

export type DeploymentEmbeddingParams = z.infer<typeof DeploymentEmbeddingParamsSchema>;

export const DeploymentEmbeddingNameParamsSchema = z.object({
    name: z.string().min(1)
});

export type DeploymentEmbeddingNameParams = z.infer<typeof DeploymentEmbeddingNameParamsSchema>;

// Run deployment embedding request schema
export const RunDeploymentEmbeddingRequestSchema = z.object({
    inputs: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])
});

export type RunDeploymentEmbeddingRequest = z.infer<typeof RunDeploymentEmbeddingRequestSchema>;

// Run deployment embedding response schema
export const RunDeploymentEmbeddingResponseSchema = z.object({
    jobId: z.string()
});

export type RunDeploymentEmbeddingResponse = z.infer<typeof RunDeploymentEmbeddingResponseSchema>;

export const DeploymentEmbeddingApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/deployment-embeddings',
    endpoints: {
        deploymentEmbeddings: {
            list: {
                method: 'GET',
                path: '/',
                query: DeploymentEmbeddingListQuerySchema,
                responses: CreateResponses({
                    200: PaginatedDeploymentEmbeddingsResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            create: {
                method: 'POST',
                path: '/',
                body: CreateDeploymentEmbeddingRequestSchema,
                responses: CreateResponses({
                    201: DeploymentEmbeddingResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/:id',
                params: DeploymentEmbeddingParamsSchema,
                responses: CreateResponses({
                    200: DeploymentEmbeddingResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getByName: {
                method: 'GET',
                path: '/name/:name',
                params: DeploymentEmbeddingNameParamsSchema,
                responses: CreateResponses({
                    200: DeploymentEmbeddingResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'PUT',
                path: '/:id',
                params: DeploymentEmbeddingParamsSchema,
                body: UpdateDeploymentEmbeddingRequestSchema,
                responses: CreateResponses({
                    200: DeploymentEmbeddingResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/:id',
                params: DeploymentEmbeddingParamsSchema,
                responses: CreateResponses({
                    204: z.object({}),
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            run: {
                method: 'POST',
                path: '/run/:name',
                params: DeploymentEmbeddingNameParamsSchema,
                body: RunDeploymentEmbeddingRequestSchema,
                responses: CreateResponses({
                    201: RunDeploymentEmbeddingResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
