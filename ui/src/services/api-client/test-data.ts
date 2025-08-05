import { ApiClient } from "ts-typed-api/client";
import { TestDataApiDefinition, type CreateTestDataGroupRequest } from "../definitions/test-data";
import { errorHandle } from "./error-handle";

export const testDataApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    TestDataApiDefinition
);
// Helper functions for test data API
export const testDataApi = {
    // Groups API
    groups: {
        selectList: () =>
            testDataApiClient.callApi('groups', 'selectList', {}, {
                ...errorHandle,
                200: (payload) => payload.data,
            }),

        list: (options?: { query?: { page?: string; limit?: string; search?: string; orderBy?: 'name' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
            testDataApiClient.callApi('groups', 'list', options, {
                ...errorHandle,
                200: (payload) => payload.data,
            }),

        create: (body: CreateTestDataGroupRequest) =>
            testDataApiClient.callApi('groups', 'create', { body }, {
                ...errorHandle,
                201: (payload) => payload.data,
            }),

        getById: (id: string) =>
            testDataApiClient.callApi('groups', 'getById', { params: { id } }, {
                ...errorHandle,
                200: (payload) => payload.data,
            }),

        update: (id: string, body: CreateTestDataGroupRequest) =>
            testDataApiClient.callApi('groups', 'update', { params: { id }, body }, {
                ...errorHandle,
                200: (payload) => payload.data,
            }),

        delete: (id: string) =>
            testDataApiClient.callApi('groups', 'delete', { params: { id } }, {
                ...errorHandle,
                204: () => undefined,
            }),

        listItems: (groupId: string, options?: { query?: { page?: string; limit?: string; search?: string; orderBy?: 'name' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
            testDataApiClient.callApi('groups', 'listItems', { params: { groupId }, ...options }, {
                ...errorHandle,
                200: (payload) => payload.data,
            }),

        createItem: (groupId: string, body: { name?: string; content: string }) =>
            testDataApiClient.callApi('groups', 'createItem', { params: { groupId }, body }, {
                ...errorHandle,
                201: (payload) => payload.data,
            }),

        bulkCreateItems: (groupId: string, body: { items: Array<{ name?: string; content: string }> }) =>
            testDataApiClient.callApi('groups', 'bulkCreateItems', { params: { groupId }, body }, {
                ...errorHandle,
                201: (payload) => payload.data,
                400: (payload) => payload.data,
            })
    },

    // Items API
    items: {
        getById: (id: string) =>
            testDataApiClient.callApi('items', 'getById', { params: { id } }, {
                ...errorHandle,
                200: (payload) => payload.data,
            }),

        update: (id: string, body: { name?: string; content?: string }) =>
            testDataApiClient.callApi('items', 'update', { params: { id }, body }, {
                ...errorHandle,
                200: (payload) => payload.data,
            }),

        delete: (id: string) =>
            testDataApiClient.callApi('items', 'delete', { params: { id } }, {
                ...errorHandle,
                204: () => undefined,
            }),

        compilePrompt: (body: { promptId: string; testDataItemId: string; promptVersion?: number }) =>
            testDataApiClient.callApi('items', 'compilePrompt', { body }, {
                ...errorHandle,
                200: (payload) => payload.data,
            })
    }
};
