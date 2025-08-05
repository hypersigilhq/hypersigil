import { ApiClient } from "ts-typed-api/client";
import { AuthApiDefinition, type LoginRequest, type RegisterFirstAdminRequest } from "../definitions/auth";
import { errorHandle } from "./error-handle";
import { eventBus } from "../event-bus";

export const authApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    AuthApiDefinition
);
// Helper functions for auth API
export const authApi = {
    check: () =>
        authApiClient.callApi('auth', 'check', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    login: (body: LoginRequest) =>
        authApiClient.callApi('auth', 'login', { body }, {
            ...errorHandle,
            200: (payload) => {
                // Emit login event with user data
                if (payload.data?.user) {
                    eventBus.emit('auth:login', {
                        userId: payload.data.user.email, // Use email as userId since id is not available
                        email: payload.data.user.email
                    });
                }
                return payload.data;
            },
        }),

    registerFirstAdmin: (body: RegisterFirstAdminRequest) =>
        authApiClient.callApi('auth', 'registerFirstAdmin', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit login event with user data for first admin registration
                if (payload.data?.user) {
                    eventBus.emit('auth:login', {
                        userId: payload.data.user.email, // Use email as userId since id is not available
                        email: payload.data.user.email
                    });
                }
                return payload.data;
            },
        }),

    activate: (body: { invitation_token: string; password: string }) =>
        (authApiClient as any).callApi('auth', 'activate', { body }, {
            ...errorHandle,
            200: (payload: any) => {
                // Emit login event with user data for user activation
                if (payload.data?.user) {
                    eventBus.emit('auth:login', {
                        userId: payload.data.user.email, // Use email as userId since id is not available
                        email: payload.data.user.email
                    });
                }
                return payload.data;
            },
        })
};
