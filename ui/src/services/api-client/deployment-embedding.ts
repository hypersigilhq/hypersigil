import { ApiClient } from "ts-typed-api/client";
import { DeploymentEmbeddingApiDefinition, type CreateDeploymentEmbeddingRequest, type UpdateDeploymentEmbeddingRequest } from "../definitions/deployment-embedding";
import { errorHandle } from "./error-handle";
import { eventBus } from "../event-bus";

export const deploymentEmbeddingApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    DeploymentEmbeddingApiDefinition
);

export const deploymentEmbeddingsApi = {
    list: (options?: { query?: { page?: string; limit?: string; search?: string; orderBy?: 'name' | 'model' | 'status' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
        deploymentEmbeddingApiClient.callApi('deploymentEmbeddings', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateDeploymentEmbeddingRequest) =>
        deploymentEmbeddingApiClient.callApi('deploymentEmbeddings', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit deployment embedding created event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('deployment-embedding:created', {
                        deploymentEmbeddingId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    getById: (id: string) =>
        deploymentEmbeddingApiClient.callApi('deploymentEmbeddings', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getByName: (name: string) =>
        deploymentEmbeddingApiClient.callApi('deploymentEmbeddings', 'getByName', { params: { name } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: UpdateDeploymentEmbeddingRequest) =>
        deploymentEmbeddingApiClient.callApi('deploymentEmbeddings', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => {
                // Emit deployment embedding updated event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('deployment-embedding:updated', {
                        deploymentEmbeddingId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    delete: (id: string) =>
        deploymentEmbeddingApiClient.callApi('deploymentEmbeddings', 'delete', { params: { id } }, {
            ...errorHandle,
            204: () => {
                // Emit deployment embedding deleted event
                eventBus.emit('deployment-embedding:deleted', { deploymentEmbeddingId: id });
                return undefined;
            },
        }),

    run: (name: string, body: { inputs: string | string[] }) =>
        deploymentEmbeddingApiClient.callApi('deploymentEmbeddings', 'run', { params: { name }, body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        })
};
