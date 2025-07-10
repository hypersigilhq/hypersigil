import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema } from './common';

// Response schemas
export const ExecutionBundleResponseSchema = z.object({
    id: z.string(),
    test_group_id: z.string(),
    execution_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

export type ExecutionBundleResponse = z.infer<typeof ExecutionBundleResponseSchema>;

// Query schemas
export const ExecutionBundleListQuerySchema = z.object({
    test_group_id: z.string().uuid()
});

export type ExecutionBundleListQuery = z.infer<typeof ExecutionBundleListQuerySchema>;

export const ExecutionBundleApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/execution-bundles',
    endpoints: {
        executionBundles: {
            list: {
                method: 'GET',
                path: '/',
                params: z.object({}),
                query: ExecutionBundleListQuerySchema,
                body: z.object({}),
                responses: CreateResponses({
                    200: z.array(ExecutionBundleResponseSchema),
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
