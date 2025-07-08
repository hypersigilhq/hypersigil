import { ApiClient } from 'ts-typed-api/client';
import { PromptApiDefinition } from './prompt-definitions';

// Create the API client with the base URL
export const apiClient = new ApiClient(
    'http://localhost:3000', // Adjust this to match your backend URL
    PromptApiDefinition
);

// Set default headers
apiClient.setHeader('Content-Type', 'application/json');

// Helper functions for prompts API
export const promptsApi = {
    list: (options?: { query?: { page?: string; limit?: string; search?: string; orderBy?: 'name' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
        apiClient.callApi('prompts', 'list', options, {
            200: (payload) => payload.data,
            400: (payload) => { throw new Error(payload.data?.error || 'Bad request'); },
            500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
            422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
        }),

    create: (body: { name: string; prompt: string; json_schema_response: Record<string, any> }) =>
        apiClient.callApi('prompts', 'create', { body }, {
            201: (payload) => payload.data,
            400: (payload) => { throw new Error(payload.data?.error || 'Bad request'); },
            500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
            422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
        }),

    getById: (id: string) =>
        apiClient.callApi('prompts', 'getById', { params: { id } }, {
            200: (payload) => payload.data,
            404: (payload) => { throw new Error(payload.data?.error || 'Not found'); },
            500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
            422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
        }),

    update: (id: string, body: { name?: string; prompt?: string; json_schema_response?: Record<string, any> }) =>
        apiClient.callApi('prompts', 'update', { params: { id }, body }, {
            200: (payload) => payload.data,
            400: (payload) => { throw new Error(payload.data?.error || 'Bad request'); },
            404: (payload) => { throw new Error(payload.data?.error || 'Not found'); },
            500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
            422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
        }),

    delete: (id: string) =>
        apiClient.callApi('prompts', 'delete', { params: { id } }, {
            204: () => undefined,
            404: (payload) => { throw new Error(payload.data?.error || 'Not found'); },
            500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
            422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
        }),

    searchByName: (pattern: string) =>
        apiClient.callApi('prompts', 'searchByName', { params: { pattern } }, {
            200: (payload) => payload.data,
            400: (payload) => { throw new Error(payload.data?.error || 'Bad request'); },
            500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
            422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
        }),

    getRecent: (options?: { query?: { limit?: string } }) =>
        apiClient.callApi('prompts', 'getRecent', options, {
            200: (payload) => payload.data,
            400: (payload) => { throw new Error(payload.data?.error || 'Bad request'); },
            500: (payload) => { throw new Error(payload.data?.error || 'Server error'); },
            422: (payload) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); }
        })
};
