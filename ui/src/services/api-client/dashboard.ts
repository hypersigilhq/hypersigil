import { ApiClient } from "ts-typed-api/client";
import { errorHandle } from "./error-handle";
import { DashboardApiDefinition } from "../definitions/dashboard";

export const dashboardApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    DashboardApiDefinition
);

// Helper functions for dashboard API
export const dashboardApi = {
    getStats: (query?: { startDate?: string; endDate?: string }) =>
        dashboardApiClient.callApi('dashboard', 'getStats', { query }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getTokenUsageByProviderModel: (query?: { startDate?: string; endDate?: string }) =>
        dashboardApiClient.callApi('dashboard', 'getTokenUsageByProviderModel', { query }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getDailyTokenUsage: (query?: { startDate?: string; endDate?: string; days?: number }) =>
        dashboardApiClient.callApi('dashboard', 'getDailyTokenUsage', { query }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getHourlyTokenUsage: (query?: { startDate?: string; endDate?: string; hours?: number }) =>
        dashboardApiClient.callApi('dashboard', 'getHourlyTokenUsage', { query }, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};
