import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema } from './common';
import { AIProviderNamesDefinition } from './execution';

const settingsTypeLLMApiKey = "llm-api-key"
// more types can be added here

// AI Provider enum schema
export const AIProviderNameSchema = z.enum(AIProviderNamesDefinition);

// Base settings document schema
export const BaseSettingsDocumentSchema = z.object({
    id: z.string(),
    type: z.string(),
    identifier: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

// LLM API Key Settings schemas
export const LlmApiKeySettingsSchema = BaseSettingsDocumentSchema.extend({
    type: z.literal(settingsTypeLLMApiKey),
    identifier: AIProviderNameSchema,
    provider: AIProviderNameSchema,
    api_key: z.string()
});


// Union type for all settings
export const SettingsDocumentSchema = z.discriminatedUnion('type', [
    LlmApiKeySettingsSchema,
]);

export type LlmApiKeySettings = z.infer<typeof LlmApiKeySettingsSchema>;
export type SettingsDocument = z.infer<typeof SettingsDocumentSchema>;

// Request schemas for creating settings
export const CreateLlmApiKeySettingsRequestSchema = z.object({
    provider: AIProviderNameSchema,
    api_key: z.string().min(1)
});

export const CreateTokenLimitSettingsRequestSchema = z.object({
    provider: AIProviderNameSchema,
    model: z.string().min(1),
    limit: z.number().min(1)
});

// Request schemas for updating settings
export const UpdateLlmApiKeySettingsRequestSchema = z.object({
    api_key: z.string().min(1).optional()
});

export const UpdateTokenLimitSettingsRequestSchema = z.object({
    limit: z.number().min(1).optional()
});

// Generic create/update request schemas
export const CreateSettingsRequestSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(settingsTypeLLMApiKey),
        data: CreateLlmApiKeySettingsRequestSchema
    })
]);

export const UpdateSettingsRequestSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(settingsTypeLLMApiKey),
        data: UpdateLlmApiKeySettingsRequestSchema
    })
]);

export type CreateLlmApiKeySettingsRequest = z.infer<typeof CreateLlmApiKeySettingsRequestSchema>;
export type UpdateLlmApiKeySettingsRequest = z.infer<typeof UpdateLlmApiKeySettingsRequestSchema>;
export type CreateSettingsRequest = z.infer<typeof CreateSettingsRequestSchema>;
export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsRequestSchema>;

// Response schemas
export const ListSettingsResponseSchema = z.object({
    settings: z.array(SettingsDocumentSchema)
});

export const ListSettingsByTypeResponseSchema = z.object({
    settings: z.array(SettingsDocumentSchema),
    type: z.string()
});

export type ListSettingsResponse = z.infer<typeof ListSettingsResponseSchema>;
export type ListSettingsByTypeResponse = z.infer<typeof ListSettingsByTypeResponseSchema>;

// API Definition
export const SettingsApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/settings',
    endpoints: {
        settings: {
            // List all settings
            list: {
                method: 'GET',
                path: '/',
                responses: CreateResponses({
                    200: ListSettingsResponseSchema,
                    401: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            // Create a new setting
            create: {
                method: 'POST',
                path: '/',
                body: CreateSettingsRequestSchema,
                responses: CreateResponses({
                    201: SettingsDocumentSchema,
                    400: ErrorResponseSchema,
                    401: ErrorResponseSchema,
                    409: ErrorResponseSchema, // Conflict if setting already exists
                    500: ErrorResponseSchema
                })
            },

            // Get a specific setting by ID
            get: {
                method: 'GET',
                path: '/:id',
                params: z.object({
                    id: z.string()
                }),
                responses: CreateResponses({
                    200: SettingsDocumentSchema,
                    401: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            // Update a specific setting by ID
            update: {
                method: 'PUT',
                path: '/:id',
                params: z.object({
                    id: z.string()
                }),
                body: UpdateSettingsRequestSchema,
                responses: CreateResponses({
                    200: SettingsDocumentSchema,
                    400: ErrorResponseSchema,
                    401: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            // Delete a specific setting by ID
            delete: {
                method: 'DELETE',
                path: '/:id',
                params: z.object({
                    id: z.string()
                }),
                responses: CreateResponses({
                    200: z.object({ success: z.boolean() }),
                    401: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            // List settings by type
            listByType: {
                method: 'GET',
                path: '/type/:type',
                params: z.object({
                    type: z.enum([settingsTypeLLMApiKey])
                }),
                responses: CreateResponses({
                    200: ListSettingsByTypeResponseSchema,
                    401: ErrorResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },

            // Get setting by type and identifier
            getByTypeAndIdentifier: {
                method: 'GET',
                path: '/type/:type/identifier/:identifier',
                params: z.object({
                    type: z.enum([settingsTypeLLMApiKey]),
                    identifier: z.string()
                }),
                responses: CreateResponses({
                    200: SettingsDocumentSchema,
                    401: ErrorResponseSchema,
                    404: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            },
        }
    }
});
