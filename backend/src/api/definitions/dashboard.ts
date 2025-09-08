import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema } from './common';

// Dashboard data schemas
export const TokenUsageSummarySchema = z.object({
    provider: z.string(),
    model: z.string(),
    totalTokens: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    executionCount: z.number()
});

export const DailyTokenUsageSchema = z.object({
    date: z.string(), // YYYY-MM-DD format
    totalTokens: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    executionCount: z.number()
});

export const HourlyTokenUsageSchema = z.object({
    hour: z.number(), // 0-23
    totalTokens: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    executionCount: z.number()
});

export const DailyTokenUsageByProviderModelSchema = z.object({
    date: z.string(), // YYYY-MM-DD format
    provider: z.string(),
    model: z.string(),
    totalTokens: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    executionCount: z.number()
});

export const HourlyTokenUsageByProviderModelSchema = z.object({
    hour: z.number(), // 0-23
    provider: z.string(),
    model: z.string(),
    totalTokens: z.number(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    executionCount: z.number()
});

export const DashboardStatsSchema = z.object({
    totalTokensUsed: z.number(),
    totalExecutions: z.number(),
    activeProviders: z.number(),
    activeModels: z.number(),
    topProvider: z.object({
        name: z.string(),
        tokens: z.number(),
        percentage: z.number()
    }).optional(),
    topModel: z.object({
        name: z.string(),
        tokens: z.number(),
        percentage: z.number()
    }).optional()
});

// Response schemas
export const TokenUsageSummaryResponseSchema = z.array(TokenUsageSummarySchema);

export const DailyTokenUsageResponseSchema = z.array(DailyTokenUsageSchema);

export const HourlyTokenUsageResponseSchema = z.array(HourlyTokenUsageSchema);

export const DailyTokenUsageByProviderModelResponseSchema = z.array(DailyTokenUsageByProviderModelSchema);

export const HourlyTokenUsageByProviderModelResponseSchema = z.array(HourlyTokenUsageByProviderModelSchema);

export const DashboardStatsResponseSchema = DashboardStatsSchema;

// Query schemas
export const DateRangeQuerySchema = z.object({
    startDate: z.string().optional(), // ISO date string
    endDate: z.string().optional()    // ISO date string
});

export const DashboardApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/dashboard',
    endpoints: {
        dashboard: {
            getStats: {
                method: 'GET',
                path: '/stats',
                query: DateRangeQuerySchema,
                responses: CreateResponses({
                    200: DashboardStatsResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getTokenUsageByProviderModel: {
                method: 'GET',
                path: '/token-usage/summary',
                query: DateRangeQuerySchema,
                responses: CreateResponses({
                    200: TokenUsageSummaryResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getDailyTokenUsage: {
                method: 'GET',
                path: '/token-usage/daily',
                query: DateRangeQuerySchema.extend({
                    days: z.number().min(1).max(90).optional().default(30)
                }),
                responses: CreateResponses({
                    200: DailyTokenUsageResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getHourlyTokenUsage: {
                method: 'GET',
                path: '/token-usage/hourly',
                query: DateRangeQuerySchema.extend({
                    hours: z.number().min(1).max(168).optional().default(24) // max 1 week
                }),
                responses: CreateResponses({
                    200: HourlyTokenUsageResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getDailyTokenUsageByProviderModel: {
                method: 'GET',
                path: '/token-usage/daily/grouped',
                query: DateRangeQuerySchema.extend({
                    days: z.number().min(1).max(90).optional().default(30)
                }),
                responses: CreateResponses({
                    200: DailyTokenUsageByProviderModelResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            getHourlyTokenUsageByProviderModel: {
                method: 'GET',
                path: '/token-usage/hourly/grouped',
                query: DateRangeQuerySchema.extend({
                    hours: z.number().min(1).max(168).optional().default(24) // max 1 week
                }),
                responses: CreateResponses({
                    200: HourlyTokenUsageByProviderModelResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
