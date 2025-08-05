import { ApiClient } from "ts-typed-api/client";
import { ApiKeyApiDefinition, type CreateApiKeyRequest, type UpdateApiKeyRequest } from "../definitions/api-key";
import { errorHandle } from "./error-handle";

export const apiKeyApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    ApiKeyApiDefinition
);

// Helper functions for API keys API
export const apiKeysApi = {
    list: () =>
        apiKeyApiClient.callApi('apiKeys', 'list', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateApiKeyRequest) =>
        apiKeyApiClient.callApi('apiKeys', 'create', { body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    get: (id: string) =>
        apiKeyApiClient.callApi('apiKeys', 'get', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: UpdateApiKeyRequest) =>
        apiKeyApiClient.callApi('apiKeys', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    revoke: (options: { id: string }) =>
        apiKeyApiClient.callApi('apiKeys', 'revoke', { params: options }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    stats: () =>
        apiKeyApiClient.callApi('apiKeys', 'stats', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};
