import { z } from 'zod';
import { CreateApiDefinition, CreateResponses } from 'ts-typed-api/client';
import { ErrorResponseSchema } from './common';
import { AIProviderNamesDefinition } from './execution';

const ServiceApiProviderNames = ["voyageai"] as const

const settingsTypeLLMApiKey = "llm-api-key"
const settingsTypeWebhookDestination = "webhook-destination"
const settingsTypeServiceApiKey = "service-api-key"
const SettingTypesSchema = z.enum([settingsTypeLLMApiKey, settingsTypeWebhookDestination, settingsTypeServiceApiKey])
export type SettingsTypes = z.infer<typeof SettingTypesSchema>;

// more types can be added here

// AI Provider enum schema
export const AIProviderNameSchema = z.enum(AIProviderNamesDefinition);
export const ServiceApiProviderNameSchema = z.enum(ServiceApiProviderNames);

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
    api_key: z.string(),
    active: z.boolean()
});

// Webhook Destination Settings schemas
export const WebhookDestinationSettingsSchema = BaseSettingsDocumentSchema.extend({
    type: z.literal(settingsTypeWebhookDestination),
    identifier: z.string(),
    name: z.string(),
    url: z.string().url(),
    active: z.boolean()
});

// Service API Key Settings schemas
export const ServiceApiKeySettingsSchema = BaseSettingsDocumentSchema.extend({
    type: z.literal(settingsTypeServiceApiKey),
    identifier: z.string(),
    provider: ServiceApiProviderNameSchema,
    api_key: z.string(),
    active: z.boolean()
});

// Union type for all settings
export const SettingsDocumentSchema = z.discriminatedUnion('type', [
    LlmApiKeySettingsSchema,
    WebhookDestinationSettingsSchema,
    ServiceApiKeySettingsSchema,
]);

export type LlmApiKeySettings = z.infer<typeof LlmApiKeySettingsSchema>;
export type WebhookDestinationSettings = z.infer<typeof WebhookDestinationSettingsSchema>;
export type ServiceApiKeySettings = z.infer<typeof ServiceApiKeySettingsSchema>;
export type SettingsDocument = z.infer<typeof SettingsDocumentSchema>;

// Request schemas for creating settings
export const CreateLlmApiKeySettingsRequestSchema = z.object({
    provider: AIProviderNameSchema,
    api_key: z.string().min(1),
    active: z.boolean().default(true)
});

export const CreateWebhookDestinationSettingsRequestSchema = z.object({
    name: z.string().min(1),
    url: z.string().url(),
    active: z.boolean().default(true)
});

export const CreateServiceApiKeySettingsRequestSchema = z.object({
    provider: z.literal("voyageai"),
    api_key: z.string().min(1),
    active: z.boolean().default(true)
});

export const CreateTokenLimitSettingsRequestSchema = z.object({
    provider: AIProviderNameSchema,
    model: z.string().min(1),
    limit: z.number().min(1)
});

// Request schemas for updating settings
export const UpdateLlmApiKeySettingsRequestSchema = z.object({
    api_key: z.string().min(1).optional(),
    active: z.boolean().optional()
});

export const UpdateWebhookDestinationSettingsRequestSchema = z.object({
    name: z.string().min(1).optional(),
    url: z.string().url().optional(),
    active: z.boolean().optional()
});

export const UpdateServiceApiKeySettingsRequestSchema = z.object({
    api_key: z.string().min(1).optional(),
    active: z.boolean().optional()
});

export const UpdateTokenLimitSettingsRequestSchema = z.object({
    limit: z.number().min(1).optional()
});

// Generic create/update request schemas
export const CreateSettingsRequestSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(settingsTypeLLMApiKey),
        data: CreateLlmApiKeySettingsRequestSchema
    }),
    z.object({
        type: z.literal(settingsTypeWebhookDestination),
        data: CreateWebhookDestinationSettingsRequestSchema
    }),
    z.object({
        type: z.literal(settingsTypeServiceApiKey),
        data: CreateServiceApiKeySettingsRequestSchema
    })
]);

export const UpdateSettingsRequestSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(settingsTypeLLMApiKey),
        data: UpdateLlmApiKeySettingsRequestSchema
    }),
    z.object({
        type: z.literal(settingsTypeWebhookDestination),
        data: UpdateWebhookDestinationSettingsRequestSchema
    }),
    z.object({
        type: z.literal(settingsTypeServiceApiKey),
        data: UpdateServiceApiKeySettingsRequestSchema
    })
]);

export type CreateLlmApiKeySettingsRequest = z.infer<typeof CreateLlmApiKeySettingsRequestSchema>;
export type CreateWebhookDestinationSettingsRequest = z.infer<typeof CreateWebhookDestinationSettingsRequestSchema>;
export type CreateServiceApiKeySettingsRequest = z.infer<typeof CreateServiceApiKeySettingsRequestSchema>;
export type UpdateLlmApiKeySettingsRequest = z.infer<typeof UpdateLlmApiKeySettingsRequestSchema>;
export type UpdateWebhookDestinationSettingsRequest = z.infer<typeof UpdateWebhookDestinationSettingsRequestSchema>;
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
                    type: SettingTypesSchema
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
                    type: SettingTypesSchema,
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
