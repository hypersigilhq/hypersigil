import { promptApiClient } from './prompt';
import { commentApiClient } from './commentsApi';
import { deploymentApiClient } from './deployment';
import { executionApiClient } from './execution';
import { testDataApiClient } from './test-data';
import { settingsApiClient } from './settings';
import { fileApiClient } from './file';
import { authApiClient } from './auth';
import { apiKeyApiClient } from './api-key';
import { userApiClient } from './user';
import { jobApiClient } from './job';
import { executionBundleApiClient } from './execution-bundle';
import { commonApiClient } from './common';
import { dashboardApiClient } from './dashboard';

export { promptsApi } from "./prompt"
export { commentsApi } from "./commentsApi"
export { deploymentsApi } from "./deployment"
export { executionsApi } from "./execution"
export { testDataApi } from "./test-data"
export { settingsApi } from "./settings"
export { filesApi } from "./file"
export { authApi } from "./auth"
export { apiKeysApi } from "./api-key"
export { jobsApi } from "./job"
export { userApi } from "./user"
export { executionBundlesApi } from "./execution-bundle"
export { commonApi } from "./common"
export { dashboardApi } from "./dashboard"

// Array of all API clients for token management
const allApiClients = [
    promptApiClient,
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
    commonApiClient,
    dashboardApiClient
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
