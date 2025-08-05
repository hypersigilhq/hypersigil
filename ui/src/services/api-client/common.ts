import { ApiClient } from "ts-typed-api/client";
import { CommonApiDefinition } from "../definitions/common";
import { errorHandle } from "./error-handle";

export const commonApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    CommonApiDefinition
);

// Helper functions for common API
export const commonApi = {
    getOnboardingStatus: () =>
        commonApiClient.callApi('common', 'getOnboardingStatus', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};
