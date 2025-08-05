import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';

// Job status enum
export const JobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'retrying', 'terminated']);

export type JobStatus = z.infer<typeof JobStatusSchema>;

// Job response schema
export const JobResponseSchema = z.object({
    id: z.string(),
    type: z.string(),
    data: z.any(),
    status: JobStatusSchema,
    result: z.any().optional(),
    error: z.string().optional(),
    terminationReason: z.string().optional(),
    attempts: z.number(),
    maxAttempts: z.number(),
    scheduledAt: z.string(),
    nextRetryAt: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    retryDelayMs: z.number().optional(),
    retryBackoffMultiplier: z.number().optional(),
    maxRetryDelayMs: z.number().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

export type JobResponse = z.infer<typeof JobResponseSchema>;

// Paginated response schema
export const PaginatedJobsResponseSchema = createPaginationResponseSchema(JobResponseSchema);

export type PaginatedJobsResponse = z.infer<typeof PaginatedJobsResponseSchema>;

// Query schemas
export const JobListQuerySchema = PaginationQuerySchema.extend({
    status: JobStatusSchema.optional(),
    jobName: z.string().optional(), // Filter by job type
    search: z.string().optional(), // Search by job ID
    orderBy: z.enum(['created_at', 'updated_at', 'scheduledAt', 'startedAt', 'completedAt']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type JobListQuery = z.infer<typeof JobListQuerySchema>;

// Parameter schemas
export const JobParamsSchema = z.object({
    id: z.string().uuid()
});

export type JobParams = z.infer<typeof JobParamsSchema>;

// API Definition
export const JobApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/jobs',
    endpoints: {
        jobs: {
            list: {
                method: 'GET',
                path: '/',
                query: JobListQuerySchema,
                responses: CreateResponses({
                    200: PaginatedJobsResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/:id',
                params: JobParamsSchema,
                responses: CreateResponses({
                    200: JobResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            trigger: {
                method: "POST",
                path: "/single/trigger",
                body: z.object({
                    job: z.discriminatedUnion('type', [
                        z.object({
                            type: z.literal("webhook-delivery"),
                            data: z.object({
                                url: z.url()
                            })
                        }),
                    ])
                }),
                responses: CreateResponses({
                    201: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
