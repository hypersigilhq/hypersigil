import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema, createPaginationResponseSchema, PaginationQuerySchema, OrderDirectionSchema } from './common';

// Response schemas
export const FileResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    data: z.string(), // base64 encoded file data
    uploadedBy: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

export type FileResponse = z.infer<typeof FileResponseSchema>;

// Request schemas
export const CreateFileRequestSchema = z.object({
    name: z.string().min(1).max(255),
    originalName: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    size: z.number().min(0),
    data: z.string().min(1), // base64 encoded file data
    uploadedBy: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
});

export type CreateFileRequest = z.infer<typeof CreateFileRequestSchema>;

export const UpdateFileRequestSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
});

export type UpdateFileRequest = z.infer<typeof UpdateFileRequestSchema>;

// Paginated response schema
export const PaginatedFilesResponseSchema = createPaginationResponseSchema(FileResponseSchema);

export type PaginatedFilesResponse = z.infer<typeof PaginatedFilesResponseSchema>;

// Query schemas
export const FileListQuerySchema = PaginationQuerySchema.extend({
    search: z.string().optional(),
    mimeType: z.string().optional(),
    orderBy: z.enum(['name', 'originalName', 'size', 'created_at', 'updated_at']).optional().default('created_at'),
    orderDirection: OrderDirectionSchema.optional().default('DESC')
});

export type FileListQuery = z.infer<typeof FileListQuerySchema>;

export const FileRecentQuerySchema = z.object({
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(50)).optional().default(10)
});

export type FileRecentQuery = z.infer<typeof FileRecentQuerySchema>;

export const FileSizeFilterQuerySchema = z.object({
    minSize: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
    maxSize: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
});

export type FileSizeFilterQuery = z.infer<typeof FileSizeFilterQuerySchema>;

// Parameter schemas
export const FileParamsSchema = z.object({
    id: z.string().uuid()
});

export type FileParams = z.infer<typeof FileParamsSchema>;

export const FileSearchParamsSchema = z.object({
    pattern: z.string().min(1)
});

export type FileSearchParams = z.infer<typeof FileSearchParamsSchema>;

export const FileTagParamsSchema = z.object({
    tag: z.string().min(1)
});

export type FileTagParams = z.infer<typeof FileTagParamsSchema>;

// File statistics schema
export const FileStatsResponseSchema = z.object({
    totalFiles: z.number(),
    totalSize: z.number(),
    averageSize: z.number(),
    maxSize: z.number(),
    minSize: z.number()
});

export type FileStatsResponse = z.infer<typeof FileStatsResponseSchema>;

// Select list schema for dropdowns
export const FileSelectListSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        originalName: z.string(),
        mimeType: z.string(),
        size: z.number()
    }))
});

export type FileSelectListResponse = z.infer<typeof FileSelectListSchema>;

export const FileApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/files',
    endpoints: {
        files: {
            selectList: {
                method: 'GET',
                path: '/select-list',
                responses: CreateResponses({
                    200: FileSelectListSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                }),
            },
            list: {
                method: 'GET',
                path: '/',
                query: FileListQuerySchema,
                responses: CreateResponses({
                    200: PaginatedFilesResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            create: {
                method: 'POST',
                path: '/',
                body: CreateFileRequestSchema,
                responses: CreateResponses({
                    201: FileResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getById: {
                method: 'GET',
                path: '/:id',
                params: FileParamsSchema,
                responses: CreateResponses({
                    200: FileResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            delete: {
                method: 'DELETE',
                path: '/:id',
                params: FileParamsSchema,
                responses: CreateResponses({
                    204: z.object({}),
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            searchByName: {
                method: 'GET',
                path: '/search/:pattern',
                params: FileSearchParamsSchema,
                responses: CreateResponses({
                    200: z.array(FileResponseSchema),
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },
        }
    }
});
