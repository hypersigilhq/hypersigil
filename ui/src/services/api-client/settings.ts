import { ApiClient } from "ts-typed-api/client";
import { SettingsApiDefinition, type CreateSettingsRequest, type SettingsTypes, type UpdateSettingsRequest } from "../definitions/settings";
import { errorHandle } from "./error-handle";
import { eventBus } from "../event-bus";

export const settingsApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    SettingsApiDefinition
);

// Helper functions for settings API
export const settingsApi = {
    list: () =>
        settingsApiClient.callApi('settings', 'list', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateSettingsRequest) =>
        settingsApiClient.callApi('settings', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit settings event for LLM API key creation
                if (payload.data?.type === 'llm-api-key' && payload.data?.identifier) {
                    eventBus.emit('settings:llm-api-key-added', {
                        provider: payload.data.identifier
                    });
                }
                return payload.data;
            },
        }),

    get: (id: string) =>
        settingsApiClient.callApi('settings', 'get', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: UpdateSettingsRequest) =>
        settingsApiClient.callApi('settings', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    delete: (id: string) =>
        settingsApiClient.callApi('settings', 'delete', { params: { id } }, {
            ...errorHandle,
            200: (payload) => {
                // Note: Delete response only contains { success: boolean }
                // Cannot emit specific provider event without additional context
                return payload.data;
            },
        }),

    listByType: (type: SettingsTypes) =>
        settingsApiClient.callApi('settings', 'listByType', { params: { type } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getByTypeAndIdentifier: (type: SettingsTypes, identifier: string) =>
        settingsApiClient.callApi('settings', 'getByTypeAndIdentifier', { params: { type, identifier } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),
};
