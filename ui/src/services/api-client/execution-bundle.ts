import { ApiClient } from "ts-typed-api/client";
import { ExecutionBundleApiDefinition, type ExecutionBundleListQuery } from "../definitions/execution-bundle";
import { errorHandle } from "./error-handle";

export const executionBundleApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    ExecutionBundleApiDefinition
);

// Helper functions for execution bundles API
export const executionBundlesApi = {
    list: (options?: { query?: ExecutionBundleListQuery }) =>
        executionBundleApiClient.callApi('executionBundles', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};