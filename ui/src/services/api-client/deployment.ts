import { ApiClient } from "ts-typed-api/client";
import { DeploymentApiDefinition, type CreateDeploymentRequest, type UpdateDeploymentRequest } from "../definitions/deployment";
import { errorHandle } from "./error-handle";
import { eventBus } from "../event-bus";

export const deploymentApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    DeploymentApiDefinition
);
export const deploymentsApi = {
    list: (options?: { query?: { page?: string; limit?: string; search?: string; orderBy?: 'name' | 'provider' | 'model' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
        deploymentApiClient.callApi('deployments', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateDeploymentRequest) =>
        deploymentApiClient.callApi('deployments', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit deployment created event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('deployment:created', {
                        deploymentId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    getById: (id: string) =>
        deploymentApiClient.callApi('deployments', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getByName: (name: string) =>
        deploymentApiClient.callApi('deployments', 'getByName', { params: { name } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: UpdateDeploymentRequest) =>
        deploymentApiClient.callApi('deployments', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => {
                // Emit deployment updated event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('deployment:updated', {
                        deploymentId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    delete: (id: string) =>
        deploymentApiClient.callApi('deployments', 'delete', { params: { id } }, {
            ...errorHandle,
            204: () => {
                // Emit deployment deleted event
                eventBus.emit('deployment:deleted', { deploymentId: id });
                return undefined;
            },
        }),

    run: (name: string, body: { userInput: string; traceId?: string; fileId?: string }) =>
        deploymentApiClient.callApi('deployments', 'run', { params: { name }, body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        })
};