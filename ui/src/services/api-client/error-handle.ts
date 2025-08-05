import { eventBus } from "../event-bus";

export const errorHandle = {
    400: (payload: { data: { error: string, message?: string, details?: unknown } }) => { throw new Error(payload.data?.error + ": " + payload.data.message || 'Bad request'); },
    401: (payload: { data: { error: string, message?: string, details?: unknown } }) => {
        // Emit token expired event for 401 errors
        eventBus.emit('auth:token-expired');
        throw new Error(payload.data?.error + ": " + payload.data.message || 'Unauthorized');
    },
    409: (payload: { data: { error: string, message?: string, details?: unknown } }) => { throw new Error(payload.data?.error + ": " + payload.data.message || 'Conflict'); },
    500: (payload: { data: { error: string, message?: string, details?: unknown } }) => { throw new Error(payload.data?.error + ": " + payload.data.message + (payload.data.details ? ` (${payload.data.details})` : ``) || 'Server error'); },
    422: (payload: { error: any }) => { throw new Error(payload.error?.[0]?.message || 'Validation error'); },
    404: (payload: { data: { error: string, message?: string, details?: unknown } }) => { throw new Error(payload.data?.error || 'Not found'); },
}