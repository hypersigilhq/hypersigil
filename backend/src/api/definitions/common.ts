import { z } from 'zod';

// Shared error response schema
export const ErrorResponseSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
    details: z.unknown().optional()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Shared pagination query parameters
export const PaginationQuerySchema = z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional().default('1'),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional().default('10')
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// Shared pagination response structure
export const createPaginationResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
    data: z.array(dataSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
});

// Order direction enum for reuse
export const OrderDirectionSchema = z.enum(['ASC', 'DESC']);

export type OrderDirection = z.infer<typeof OrderDirectionSchema>;
