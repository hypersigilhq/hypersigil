import { ApiClient } from "ts-typed-api/client";
import { JobApiDefinition } from "../definitions/job";
import { errorHandle } from "./error-handle";

export const jobApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    JobApiDefinition
);

// Helper functions for jobs API
export const jobsApi = {
    list: (options?: { query?: { page?: string; limit?: string; status?: 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'terminated'; jobName?: string; search?: string; orderBy?: 'created_at' | 'updated_at' | 'scheduledAt' | 'startedAt' | 'completedAt'; orderDirection?: 'ASC' | 'DESC' } }) =>
        jobApiClient.callApi('jobs', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getById: (id: string) =>
        jobApiClient.callApi('jobs', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    trigger: (body: { job: { type: 'webhook-delivery'; data: { url: string } } }) =>
        jobApiClient.callApi('jobs', 'trigger', { body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        })
};