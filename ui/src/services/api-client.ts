import { ApiClient } from 'ts-typed-api/client';
import { PromptApiDefinition, type CreatePromptRequest, type GenerateAdjustmentRequest, type PreviewPromptRequest } from './definitions/prompt';
import { ExecutionApiDefinition, type CreateExecutionRequest, type ExecutionUpdateRequest, type AIProviderNameDefinition, type ExecutionAvailableModelsQueryRequest } from './definitions/execution';
import { ExecutionBundleApiDefinition, type ExecutionBundleListQuery } from './definitions/execution-bundle';
import { TestDataApiDefinition, type CreateTestDataGroupRequest } from './definitions/test-data';
import { CommentApiDefinition, type CreateCommentRequest, type CommentListQuery } from './definitions/comment';
import { AuthApiDefinition, type LoginRequest, type RegisterFirstAdminRequest } from './definitions/auth';
import { UserApiDefinition, type ListUsersQuery, type ListUsersResponse, type UserSummary } from './definitions/user';
import { ApiKeyApiDefinition, type CreateApiKeyRequest, type UpdateApiKeyRequest } from './definitions/api-key';
import { SettingsApiDefinition, type CreateSettingsRequest, type UpdateSettingsRequest } from './definitions/settings';
import { FileApiDefinition, type CreateFileRequest, type UpdateFileRequest } from './definitions/file';
import { DeploymentApiDefinition, type CreateDeploymentRequest, type UpdateDeploymentRequest } from './definitions/deployment';
import { JobApiDefinition } from './definitions/job';
import { CommonApiDefinition } from './definitions/common';
import { eventBus } from './event-bus';

// Create the API client with the base URL
export const apiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    PromptApiDefinition
);

export const executionApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    ExecutionApiDefinition
);

export const executionBundleApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    ExecutionBundleApiDefinition
);

export const testDataApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    TestDataApiDefinition
);

export const commentApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    CommentApiDefinition
);

export const userApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    UserApiDefinition
);

export const authApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    AuthApiDefinition
);

export const apiKeyApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    ApiKeyApiDefinition
);

export const settingsApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    SettingsApiDefinition
);

export const fileApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    FileApiDefinition
);

export const deploymentApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    DeploymentApiDefinition
);

export const jobApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    JobApiDefinition
);

export const commonApiClient = new ApiClient(
    document.location.origin, // Adjust this to match your backend URL
    CommonApiDefinition
);

// Array of all API clients for token management
const allApiClients = [
    apiClient,
    executionApiClient,
    executionBundleApiClient,
    testDataApiClient,
    commentApiClient,
    userApiClient,
    authApiClient,
    apiKeyApiClient,
    settingsApiClient,
    fileApiClient,
    deploymentApiClient,
    jobApiClient,
    commonApiClient
];

// Token management function
export const setAuthToken = (token: string | null): void => {
    if (token) {
        // Set Authorization header on all clients
        allApiClients.forEach(client => {
            client.setHeader('Authorization', `Bearer ${token}`);
        });
    } else {
        // Remove Authorization header from all clients
        allApiClients.forEach(client => {
            client.removeHeader('Authorization');
        });
    }
};

// Initialize token from localStorage on app startup
export const initializeAuth = (): void => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        setAuthToken(token);
    }
};

// Set default headers
apiClient.setHeader('Content-Type', 'application/json');
executionApiClient.setHeader('Content-Type', 'application/json');
executionBundleApiClient.setHeader('Content-Type', 'application/json');
testDataApiClient.setHeader('Content-Type', 'application/json');
commentApiClient.setHeader('Content-Type', 'application/json');
authApiClient.setHeader('Content-Type', 'application/json');


let errorHandle = {
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

// Helper functions for prompts API
export const promptsApi = {
    selectList: () =>
        apiClient.callApi('prompts', 'selectList', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    list: (options?: { query?: { page?: string; limit?: string; search?: string; orderBy?: 'name' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
        apiClient.callApi('prompts', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreatePromptRequest) =>
        apiClient.callApi('prompts', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit prompt created event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('prompt:created', {
                        promptId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    getById: (id: string) =>
        apiClient.callApi('prompts', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: CreatePromptRequest) =>
        apiClient.callApi('prompts', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => {
                // Emit prompt updated event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('prompt:updated', {
                        promptId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    delete: (id: string) =>
        apiClient.callApi('prompts', 'delete', { params: { id } }, {
            ...errorHandle,
            204: () => {
                // Emit prompt deleted event
                eventBus.emit('prompt:deleted', { promptId: id });
                return undefined;
            },
        }),

    searchByName: (pattern: string) =>
        apiClient.callApi('prompts', 'searchByName', { params: { pattern } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getRecent: (options?: { query?: { limit?: string } }) =>
        apiClient.callApi('prompts', 'getRecent', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    generateAdjustment: (id: string, body: GenerateAdjustmentRequest) =>
        apiClient.callApi('prompts', 'generateAdjustment', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    preview: (body: PreviewPromptRequest) =>
        apiClient.callApi('prompts', 'preview', { body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};

// Helper functions for executions API
export const executionsApi = {
    list: (options?: {
        query?: {
            page?: string;
            limit?: string;
            status?: 'pending' | 'running' | 'completed' | 'failed';
            provider?: AIProviderNameDefinition;
            promptId?: string;
            starred?: boolean;
            ids?: string;
            orderBy?: 'created_at' | 'updated_at' | 'started_at' | 'completed_at';
            orderDirection?: 'ASC' | 'DESC',
            downloadCsv?: boolean
        }
    }) =>
        executionApiClient.callApi('executions', 'list', options, {
            ...errorHandle,
            200: (payload) => options?.query?.downloadCsv ? payload.rawResponse : payload.data,
        }),

    create: (body: CreateExecutionRequest) =>
        executionApiClient.callApi('executions', 'create', { body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    getById: (id: string) =>
        executionApiClient.callApi('executions', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: ExecutionUpdateRequest) =>
        executionApiClient.callApi('executions', 'update', { params: { id }, body: body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    cancel: (id: string) =>
        executionApiClient.callApi('executions', 'cancel', { params: { id } }, {
            ...errorHandle,
            204: () => undefined,
        }),

    getStats: () =>
        executionApiClient.callApi('executions', 'getStats', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getProviderHealth: () =>
        executionApiClient.callApi('providers', 'getProviderHealth', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    listProviders: () =>
        executionApiClient.callApi('providers', 'listProviders', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getAvailableModels: (query: ExecutionAvailableModelsQueryRequest) =>
        executionApiClient.callApi('providers', 'getAvailableModels', { query }, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};

// Helper functions for execution bundles API
export const executionBundlesApi = {
    list: (options?: { query?: ExecutionBundleListQuery }) =>
        executionBundleApiClient.callApi('executionBundles', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};

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

// Helper functions for comments API
export const commentsApi = {
    create: (body: CreateCommentRequest) =>
        commentApiClient.callApi('comments', 'create', { body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    list: (options?: { query?: CommentListQuery }) =>
        commentApiClient.callApi('comments', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    delete: (id: string) => {
        commentApiClient.callApi('comments', 'delete', { params: { id } }, {
            ...errorHandle,
            204: (payload) => { },
        })
    }
};

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

// Helper functions for API keys API
export const apiKeysApi = {
    list: () =>
        apiKeyApiClient.callApi('apiKeys', 'list', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateApiKeyRequest) =>
        apiKeyApiClient.callApi('apiKeys', 'create', { body }, {
            ...errorHandle,
            201: (payload) => payload.data,
        }),

    get: (id: string) =>
        apiKeyApiClient.callApi('apiKeys', 'get', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: UpdateApiKeyRequest) =>
        apiKeyApiClient.callApi('apiKeys', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    revoke: (options: { id: string }) =>
        apiKeyApiClient.callApi('apiKeys', 'revoke', { params: options }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    stats: () =>
        apiKeyApiClient.callApi('apiKeys', 'stats', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};

// Helper functions for settings API
export const settingsApi = {
    list: () =>
        settingsApiClient.callApi('settings', 'list', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateSettingsRequest) =>
        settingsApiClient.callApi('settings', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit settings event for LLM API key creation
                if (payload.data?.type === 'llm-api-key' && payload.data?.identifier) {
                    eventBus.emit('settings:llm-api-key-added', {
                        provider: payload.data.identifier
                    });
                }
                return payload.data;
            },
        }),

    get: (id: string) =>
        settingsApiClient.callApi('settings', 'get', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    update: (id: string, body: UpdateSettingsRequest) =>
        settingsApiClient.callApi('settings', 'update', { params: { id }, body }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    delete: (id: string) =>
        settingsApiClient.callApi('settings', 'delete', { params: { id } }, {
            ...errorHandle,
            200: (payload) => {
                // Note: Delete response only contains { success: boolean }
                // Cannot emit specific provider event without additional context
                return payload.data;
            },
        }),

    listByType: (type: 'llm-api-key' | 'webhook-destination') =>
        settingsApiClient.callApi('settings', 'listByType', { params: { type } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    getByTypeAndIdentifier: (type: 'llm-api-key' | 'webhook-destination', identifier: string) =>
        settingsApiClient.callApi('settings', 'getByTypeAndIdentifier', { params: { type, identifier } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),
};

// Helper functions for files API
export const filesApi = {
    selectList: () =>
        fileApiClient.callApi('files', 'selectList', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    list: (options?: { query?: { page?: string; limit?: string; search?: string; mimeType?: string; orderBy?: 'name' | 'originalName' | 'size' | 'created_at' | 'updated_at'; orderDirection?: 'ASC' | 'DESC' } }) =>
        fileApiClient.callApi('files', 'list', options, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    create: (body: CreateFileRequest) =>
        fileApiClient.callApi('files', 'create', { body }, {
            ...errorHandle,
            201: (payload) => {
                // Emit file created event
                if (payload.data?.id && payload.data?.name) {
                    eventBus.emit('file:created', {
                        fileId: payload.data.id,
                        name: payload.data.name
                    });
                }
                return payload.data;
            },
        }),

    getById: (id: string) =>
        fileApiClient.callApi('files', 'getById', { params: { id } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        }),

    delete: (id: string) =>
        fileApiClient.callApi('files', 'delete', { params: { id } }, {
            ...errorHandle,
            204: () => {
                // Emit file deleted event
                eventBus.emit('file:deleted', { fileId: id });
                return undefined;
            },
        }),

    searchByName: (pattern: string) =>
        fileApiClient.callApi('files', 'searchByName', { params: { pattern } }, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};

// Helper functions for deployments API
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

// Helper functions for common API
export const commonApi = {
    getOnboardingStatus: () =>
        commonApiClient.callApi('common', 'getOnboardingStatus', {}, {
            ...errorHandle,
            200: (payload) => payload.data,
        })
};
