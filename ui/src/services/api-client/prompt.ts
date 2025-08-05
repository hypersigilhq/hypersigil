import { ApiClient } from 'ts-typed-api/client';
import { PromptApiDefinition, type CreatePromptRequest, type GenerateAdjustmentRequest, type PreviewPromptRequest } from '../definitions/prompt';
import { errorHandle } from './error-handle';
import { eventBus } from '../event-bus';

// Create the API client with the base URL
export const promptApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    PromptApiDefinition
);

// Helper functions for prompts API
export const promptsApi = {
    selectList: () =>
        promptApiClient.callApi('prompts', 'selectList', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    list: (options?: { query?: { page?: string; limit?: string; search?: string; orderBy?: 'name' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
        promptApiClient.callApi('prompts', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreatePromptRequest) =>
        promptApiClient.callApi('prompts', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit prompt created event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('prompt:created', {
                        promptId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    getById: (id: string) =>
        promptApiClient.callApi('prompts', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: CreatePromptRequest) =>
        promptApiClient.callApi('prompts', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => {
                // Emit prompt updated event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('prompt:updated', {
                        promptId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    delete: (id: string) =>
        promptApiClient.callApi('prompts', 'delete', { params: { id } }, {
            ...errorHandle,
            204: () => {
                // Emit prompt deleted event
                eventBus.emit('prompt:deleted', { promptId: id });
                return undefined;
            },
        }),

    searchByName: (pattern: string) =>
        promptApiClient.callApi('prompts', 'searchByName', { params: { pattern } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getRecent: (options?: { query?: { limit?: string } }) =>
        promptApiClient.callApi('prompts', 'getRecent', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    generateAdjustment: (id: string, body: GenerateAdjustmentRequest) =>
        promptApiClient.callApi('prompts', 'generateAdjustment', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    preview: (body: PreviewPromptRequest) =>
        promptApiClient.callApi('prompts', 'preview', { body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};
