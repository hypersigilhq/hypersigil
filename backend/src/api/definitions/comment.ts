import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema } from './common';

// Comment data schemas
export const GenericCommentDataSchema = z.object({
    type: z.literal("generic")
});

export const ExecutionCommentDataSchema = z.object({
    type: z.literal("execution"),
    selected_text: z.string(),
    start_offset: z.number(),
    end_offset: z.number()
});

export const CommentDataSchema = z.union([
    GenericCommentDataSchema,
    ExecutionCommentDataSchema
]);

export type GenericCommentData = z.infer<typeof GenericCommentDataSchema>;
export type ExecutionCommentData = z.infer<typeof ExecutionCommentDataSchema>;
export type CommentData = z.infer<typeof CommentDataSchema>;

// Response schema
export const CommentResponseSchema = z.object({
    id: z.string(),
    text: z.string(),
    data: CommentDataSchema,
    prompt_id: z.string().optional(),
    execution_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

export type CommentResponse = z.infer<typeof CommentResponseSchema>;

// Request schemas
export const CreateCommentRequestSchema = z.object({
    text: z.string().min(1),
    data: CommentDataSchema,
    execution_id: z.string().uuid().optional(),
    prompt_id: z.string().uuid().optional()
}).refine(input => {
    return input.execution_id || input.prompt_id
}, { message: 'Either execution_id or prompt_id is needed' });

export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;

// Query schema for listing comments
export const CommentListQuerySchema = z.object({
    prompt_id: z.string().uuid().optional(),
    execution_id: z.string().uuid().optional()
});

export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;

// API Definition
export const CommentApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/comments',
    endpoints: {
        comments: {
            create: {
                method: 'POST',
                path: '/',
                body: CreateCommentRequestSchema,
                responses: CreateResponses({
                    201: CommentResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            list: {
                method: 'GET',
                path: '/',
                query: CommentListQuerySchema,
                responses: CreateResponses({
                    200: z.array(CommentResponseSchema),
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/:id',
                params: z.object({
                    id: z.string().uuid()
                }),
                responses: CreateResponses({
                    204: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
