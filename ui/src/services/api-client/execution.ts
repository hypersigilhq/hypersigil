import { ApiClient } from "ts-typed-api/client";
import { errorHandle } from "./error-handle";
import { ExecutionApiDefinition, type AIProviderNameDefinition, type CreateExecutionRequest, type ExecutionAvailableModelsQueryRequest, type ExecutionUpdateRequest } from "../definitions/execution";

export const executionApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    ExecutionApiDefinition
);
// Helper functions for executions API
export const executionsApi = {
    list: (options?: {
        query?: {
            page?: string;
            limit?: string;
            status?: 'pending' | 'running' | 'completed' | 'failed';
            provider?: AIProviderNameDefinition;
            promptId?: string;
            starred?: boolean;
            ids?: string;
            orderBy?: 'created_at' | 'updated_at' | 'started_at' | 'completed_at';
            orderDirection?: 'ASC' | 'DESC',
            downloadCsv?: boolean
        }
    }) =>
        executionApiClient.callApi('executions', 'list', options, {
            ...errorHandle,
            200: (payload) => options?.query?.downloadCsv ? payload.rawResponse : payload.data,
        }),

    create: (body: CreateExecutionRequest) =>
        executionApiClient.callApi('executions', 'create', { body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    getById: (id: string) =>
        executionApiClient.callApi('executions', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: ExecutionUpdateRequest) =>
        executionApiClient.callApi('executions', 'update', { params: { id }, body: body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    cancel: (id: string) =>
        executionApiClient.callApi('executions', 'cancel', { params: { id } }, {
            ...errorHandle,
            204: () => undefined,
        }),

    getStats: () =>
        executionApiClient.callApi('executions', 'getStats', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getProviderHealth: () =>
        executionApiClient.callApi('providers', 'getProviderHealth', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    listProviders: () =>
        executionApiClient.callApi('providers', 'listProviders', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getAvailableModels: (query: ExecutionAvailableModelsQueryRequest) =>
        executionApiClient.callApi('providers', 'getAvailableModels', { query }, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};