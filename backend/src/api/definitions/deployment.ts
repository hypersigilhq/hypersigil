import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';
import { AIProviderNameSchema } from './settings';

// Deployment options schema
export const DeploymentOptionsSchema = z.object({
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().min(1).optional()
});

export type DeploymentOptions = z.infer<typeof DeploymentOptionsSchema>;

// Response schemas
export const DeploymentResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    promptId: z.string(),
    provider: AIProviderNameSchema,
    model: z.string(),
    options: DeploymentOptionsSchema.optional(),
    created_at: z.string(),
    updated_at: z.string()
});

export type DeploymentResponse = z.infer<typeof DeploymentResponseSchema>;

// Request schemas
export const CreateDeploymentRequestSchema = z.object({
    name: z.string().min(1).max(255).regex(/^[a-z0-9-_]+$/, 'Name must be a valid slug (lowercase letters, numbers, hyphens, and underscores only)'),
    promptId: z.string().uuid(),
    provider: AIProviderNameSchema,
    model: z.string().min(1),
    options: DeploymentOptionsSchema.optional()
});

export type CreateDeploymentRequest = z.infer<typeof CreateDeploymentRequestSchema>;

export const UpdateDeploymentRequestSchema = z.object({
    name: z.string().min(1).max(255).regex(/^[a-z0-9-_]+$/, 'Name must be a valid slug (lowercase letters, numbers, hyphens, and underscores only)').optional(),
    promptId: z.string().uuid().optional(),
    provider: AIProviderNameSchema.optional(),
    model: z.string().min(1).optional(),
    options: DeploymentOptionsSchema.optional()
});

export type UpdateDeploymentRequest = z.infer<typeof UpdateDeploymentRequestSchema>;

// Paginated response schema
export const PaginatedDeploymentsResponseSchema = createPaginationResponseSchema(DeploymentResponseSchema);

export type PaginatedDeploymentsResponse = z.infer<typeof PaginatedDeploymentsResponseSchema>;

// Query schemas
export const DeploymentListQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
    orderBy: z.enum(['name', 'provider', 'model', 'created_at', 'updated_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type DeploymentListQuery = z.infer<typeof DeploymentListQuerySchema>;

// Parameter schemas
export const DeploymentParamsSchema = z.object({
    id: z.string().uuid()
});

export type DeploymentParams = z.infer<typeof DeploymentParamsSchema>;

export const DeploymentNameParamsSchema = z.object({
    name: z.string().min(1)
});

export type DeploymentNameParams = z.infer<typeof DeploymentNameParamsSchema>;

// Run deployment request schema
export const RunDeploymentRequestSchema = z.object({
    userInput: z.string().min(1),
    traceId: z.string().optional(),
    fileId: z.string().uuid().optional()
});

export type RunDeploymentRequest = z.infer<typeof RunDeploymentRequestSchema>;

export const RunDeploymentResponseSchema = z.object({
    executionIds: z.array(z.string())
});

export type RunDeploymentResponse = z.infer<typeof RunDeploymentResponseSchema>;

export const DeploymentApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/deployments',
    endpoints: {
        deployments: {
            list: {
                method: 'GET',
                path: '/',
                query: DeploymentListQuerySchema,
                responses: CreateResponses({
                    200: PaginatedDeploymentsResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            create: {
                method: 'POST',
                path: '/',
                body: CreateDeploymentRequestSchema,
                responses: CreateResponses({
                    201: DeploymentResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/:id',
                params: DeploymentParamsSchema,
                responses: CreateResponses({
                    200: DeploymentResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getByName: {
                method: 'GET',
                path: '/name/:name',
                params: DeploymentNameParamsSchema,
                responses: CreateResponses({
                    200: DeploymentResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'PUT',
                path: '/:id',
                params: DeploymentParamsSchema,
                body: UpdateDeploymentRequestSchema,
                responses: CreateResponses({
                    200: DeploymentResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/:id',
                params: DeploymentParamsSchema,
                responses: CreateResponses({
                    204: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            run: {
                method: 'POST',
                path: '/run/:name',
                params: DeploymentNameParamsSchema,
                body: RunDeploymentRequestSchema,
                responses: CreateResponses({
                    201: RunDeploymentResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
