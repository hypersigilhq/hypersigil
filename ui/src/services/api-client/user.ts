import { ApiClient } from "ts-typed-api/client";
import { UserApiDefinition } from "../definitions/user";
import { errorHandle } from "./error-handle";

export const userApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    UserApiDefinition
);


export const userApi = {
    me: () =>
        userApiClient.callApi('users', 'me', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    list: (options?: { query?: { page?: string; limit?: string; search?: string; role?: 'admin' | 'user' | 'viewer'; status?: 'active' | 'inactive' | 'pending' } }) =>
        userApiClient.callApi('users', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getById: (options: { params: { id: string } }) =>
        userApiClient.callApi('users', 'getById', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    invite: (body: { email: string; name: string; role: 'admin' | 'user' | 'viewer'; profile?: any }) =>
        userApiClient.callApi('users', 'invite', { body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    update: (options: { params: { id: string }; body: { name?: string; role?: 'admin' | 'user' | 'viewer'; status?: 'active' | 'inactive' | 'pending'; profile?: any } }) =>
        userApiClient.callApi('users', 'update', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),
};