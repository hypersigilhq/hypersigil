import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api';

// Health check API definition
export const HealthApiDefinition = CreateApiDefinition({
    prefix: '/api/v1',
    endpoints: {
        health: {
            ping: {
                method: 'GET',
                path: '/health',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: z.object({
                        status: z.enum(['ok', 'error']),
                        timestamp: z.string(),
                        uptime: z.number(),
                        version: z.string(),
                        environment: z.string(),
                    }),
                    500: z.object({
                        error: z.string(),
                        message: z.string().optional(),
                    }),
                }),
            },
            status: {
                method: 'GET',
                path: '/status',
                params: z.object({}),
                query: z.object({}),
                body: z.object({}),
                responses: CreateResponses({
                    200: z.object({
                        server: z.string(),
                        timestamp: z.string(),
                        memory: z.object({
                            rss: z.number(),
                            heapTotal: z.number(),
                            heapUsed: z.number(),
                            external: z.number(),
                            arrayBuffers: z.number(),
                        }),
                        uptime: z.number(),
                        pid: z.number(),
                        platform: z.string(),
                        nodeVersion: z.string(),
                    }),
                    500: z.object({
                        error: z.string(),
                        message: z.string().optional(),
                    }),
                }),
            },
        },
    },
});

// Example API definition for demonstration
export const ExampleApiDefinition = CreateApiDefinition({
    prefix: '/api/v1',
    endpoints: {
        examples: {
            hello: {
                method: 'GET',
                path: '/hello',
                params: z.object({}),
                query: z.object({
                    name: z.string().optional(),
                }),
                body: z.object({}),
                responses: CreateResponses({
                    200: z.object({
                        message: z.string(),
                        timestamp: z.string(),
                    }),
                }),
            },
            echo: {
                method: 'POST',
                path: '/echo',
                params: z.object({}),
                query: z.object({}),
                body: z.object({
                    message: z.string(),
                    metadata: z.record(z.any()).optional(),
                }),
                responses: CreateResponses({
                    200: z.object({
                        echo: z.string(),
                        receivedAt: z.string(),
                        metadata: z.record(z.any()).optional(),
                    }),
                    400: z.object({
                        error: z.string(),
                        message: z.string().optional(),
                    }),
                }),
            },
        },
    },
});
