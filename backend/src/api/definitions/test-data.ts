import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';

// Test Data Group schemas
export const TestDataGroupResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    mode: z.enum(['raw', 'json']),
    description: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

export type TestDataGroupResponse = z.infer<typeof TestDataGroupResponseSchema>;

export const CreateTestDataGroupRequestSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    mode: z.enum(['raw', 'json'])
});

export type CreateTestDataGroupRequest = z.infer<typeof CreateTestDataGroupRequestSchema>;

export const UpdateTestDataGroupRequestSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    mode: z.enum(['raw', 'json'])
});

export type UpdateTestDataGroupRequest = z.infer<typeof UpdateTestDataGroupRequestSchema>;

// Test Data Item schemas
export const TestDataItemResponseSchema = z.object({
    id: z.string(),
    group_id: z.string(),
    name: z.string().optional(),
    content: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

export type TestDataItemResponse = z.infer<typeof TestDataItemResponseSchema>;

export const CreateTestDataItemRequestSchema = z.object({
    name: z.string().optional(),
    content: z.string().min(1)
});

export type CreateTestDataItemRequest = z.infer<typeof CreateTestDataItemRequestSchema>;

export const UpdateTestDataItemRequestSchema = z.object({
    name: z.string().optional(),
    content: z.string().min(1).optional()
});

export type UpdateTestDataItemRequest = z.infer<typeof UpdateTestDataItemRequestSchema>;

// Bulk create items schema
export const BulkCreateTestDataItemsRequestSchema = z.object({
    items: z.array(CreateTestDataItemRequestSchema).min(1).max(100)
});

export type BulkCreateTestDataItemsRequest = z.infer<typeof BulkCreateTestDataItemsRequestSchema>;

export const BulkCreateTestDataItemsResponseSchema = z.object({
    created: z.array(TestDataItemResponseSchema),
    errors: z.array(z.object({
        index: z.number(),
        error: z.string()
    }))
});

export type BulkCreateTestDataItemsResponse = z.infer<typeof BulkCreateTestDataItemsResponseSchema>;

// Paginated response schemas
export const PaginatedTestDataGroupsResponseSchema = createPaginationResponseSchema(TestDataGroupResponseSchema);
export type PaginatedTestDataGroupsResponse = z.infer<typeof PaginatedTestDataGroupsResponseSchema>;

export const PaginatedTestDataItemsResponseSchema = createPaginationResponseSchema(TestDataItemResponseSchema);
export type PaginatedTestDataItemsResponse = z.infer<typeof PaginatedTestDataItemsResponseSchema>;

// Query schemas
export const TestDataGroupListQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
    orderBy: z.enum(['name', 'created_at', 'updated_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type TestDataGroupListQuery = z.infer<typeof TestDataGroupListQuerySchema>;

export const TestDataItemListQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
    orderBy: z.enum(['name', 'created_at', 'updated_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type TestDataItemListQuery = z.infer<typeof TestDataItemListQuerySchema>;

// Parameter schemas
export const TestDataGroupParamsSchema = z.object({
    id: z.string().uuid()
});

export type TestDataGroupParams = z.infer<typeof TestDataGroupParamsSchema>;

export const TestDataItemParamsSchema = z.object({
    id: z.string().uuid()
});

export type TestDataItemParams = z.infer<typeof TestDataItemParamsSchema>;

export const TestDataGroupItemsParamsSchema = z.object({
    groupId: z.string().uuid()
});

export type TestDataGroupItemsParams = z.infer<typeof TestDataGroupItemsParamsSchema>;

// Batch execution request schema (extends existing execution)
export const BatchExecutionRequestSchema = z.object({
    promptId: z.string().uuid(),
    promptVersion: z.number().optional(),
    testDataGroupId: z.string().uuid(),
    providerModel: z.string().regex(/^[a-zA-Z0-9_-]+:.+$/, 'Must be in format provider:model'),
    options: z.object({
        schema: z.record(z.unknown()).optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).optional(),
        topP: z.number().min(0).max(1).optional(),
        topK: z.number().min(1).optional()
    }).catchall(z.unknown()).optional()
});

export type BatchExecutionRequest = z.infer<typeof BatchExecutionRequestSchema>;

export const TestDataSelectListSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        name: z.string(),
    }))
});

export type TestDataSelectListResponse = z.infer<typeof TestDataSelectListSchema>;

export const BatchExecutionResponseSchema = z.object({
    executionIds: z.array(z.string()),
    totalCreated: z.number(),
    errors: z.array(z.object({
        itemId: z.string(),
        error: z.string()
    }))
});

export type BatchExecutionResponse = z.infer<typeof BatchExecutionResponseSchema>;

// Prompt compilation schemas
export const CompilePromptRequestSchema = z.object({
    promptId: z.string().uuid(),
    testDataItemId: z.string().uuid(),
    promptVersion: z.number().optional()
});

export type CompilePromptRequest = z.infer<typeof CompilePromptRequestSchema>;

export const CompilePromptResponseSchema = z.object({
    success: z.boolean(),
    compiledPrompt: z.string().optional(),
    error: z.string().optional()
});

export type CompilePromptResponse = z.infer<typeof CompilePromptResponseSchema>;

export const TestDataApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/test-data',
    endpoints: {
        groups: {
            selectList: {
                method: 'GET',
                path: '/select-list',
                responses: CreateResponses({
                    200: TestDataSelectListSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                }),
            },
            list: {
                method: 'GET',
                path: '/groups',
                params: z.object({}),
                query: TestDataGroupListQuerySchema,
                body: z.object({}),
                responses: CreateResponses({
                    200: PaginatedTestDataGroupsResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            create: {
                method: 'POST',
                path: '/groups',
                params: z.object({}),
                query: z.object({}),
                body: CreateTestDataGroupRequestSchema,
                responses: CreateResponses({
                    201: TestDataGroupResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/groups/:id',
                params: TestDataGroupParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: TestDataGroupResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'PUT',
                path: '/groups/:id',
                params: TestDataGroupParamsSchema,
                query: z.object({}),
                body: UpdateTestDataGroupRequestSchema,
                responses: CreateResponses({
                    200: TestDataGroupResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/groups/:id',
                params: TestDataGroupParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    204: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            listItems: {
                method: 'GET',
                path: '/groups/:groupId/items',
                params: TestDataGroupItemsParamsSchema,
                query: TestDataItemListQuerySchema,
                body: z.object({}),
                responses: CreateResponses({
                    200: PaginatedTestDataItemsResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            createItem: {
                method: 'POST',
                path: '/groups/:groupId/items',
                params: TestDataGroupItemsParamsSchema,
                query: z.object({}),
                body: CreateTestDataItemRequestSchema,
                responses: CreateResponses({
                    201: TestDataItemResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            bulkCreateItems: {
                method: 'POST',
                path: '/groups/:groupId/items/bulk',
                params: TestDataGroupItemsParamsSchema,
                query: z.object({}),
                body: BulkCreateTestDataItemsRequestSchema,
                responses: CreateResponses({
                    201: BulkCreateTestDataItemsResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        },

        items: {
            getById: {
                method: 'GET',
                path: '/items/:id',
                params: TestDataItemParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: TestDataItemResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            update: {
                method: 'PUT',
                path: '/items/:id',
                params: TestDataItemParamsSchema,
                query: z.object({}),
                body: UpdateTestDataItemRequestSchema,
                responses: CreateResponses({
                    200: TestDataItemResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/items/:id',
                params: TestDataItemParamsSchema,
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    204: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            compilePrompt: {
                method: 'POST',
                path: '/compile-prompt',
                params: z.object({}),
                query: z.object({}),
                body: CompilePromptRequestSchema,
                responses: CreateResponses({
                    200: CompilePromptResponseSchema,
                    400: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
