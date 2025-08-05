import { ApiClient } from "ts-typed-api/client";
import { FileApiDefinition, type CreateFileRequest } from "../definitions/file";
import { errorHandle } from "./error-handle";
import { eventBus } from "../event-bus";

export const fileApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    FileApiDefinition
);
// Helper functions for files API
export const filesApi = {
    selectList: () =>
        fileApiClient.callApi('files', 'selectList', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    list: (options?: { query?: { page?: string; limit?: string; search?: string; mimeType?: string; orderBy?: 'name' | 'originalName' | 'size' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
        fileApiClient.callApi('files', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateFileRequest) =>
        fileApiClient.callApi('files', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit file created event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('file:created', {
                        fileId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    getById: (id: string) =>
        fileApiClient.callApi('files', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    delete: (id: string) =>
        fileApiClient.callApi('files', 'delete', { params: { id } }, {
            ...errorHandle,
            204: () => {
                // Emit file deleted event
                eventBus.emit('file:deleted', { fileId: id });
                return undefined;
            },
        }),

    searchByName: (pattern: string) =>
        fileApiClient.callApi('files', 'searchByName', { params: { pattern } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};