import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { ApiKeyApiDefinition, PublicApiKey } from '../definitions/api-key';
import { apiKeyModel, ApiKeyDocument } from '../../models/api-key';

/**
 * Helper function to format API key document(s) to public schema
 * Removes sensitive fields and formats dates properly
 */
function formatApiKeyToPublic(apiKey: ApiKeyDocument): PublicApiKey;
function formatApiKeyToPublic(apiKeys: ApiKeyDocument[]): PublicApiKey[];
function formatApiKeyToPublic(input: ApiKeyDocument | ApiKeyDocument[]): PublicApiKey | PublicApiKey[] {
    if (Array.isArray(input)) {
        return input.map(key => formatSingleApiKey(key));
    }
    return formatSingleApiKey(input);
}

function formatSingleApiKey(key: ApiKeyDocument): PublicApiKey {
    return {
        id: key.id!,
        name: key.name,
        key_prefix: key.key_prefix,
        permissions: key.permissions,
        status: key.status,
        usage_stats: {
            total_requests: key.usage_stats.total_requests,
            last_used_at: key.usage_stats.last_used_at?.toISOString(),
            last_ip: key.usage_stats.last_ip
        },
        created_at: key.created_at!.toISOString(),
        updated_at: key.updated_at!.toISOString()
    };
}

RegisterHandlers(app, ApiKeyApiDefinition, {
    apiKeys: {
        list: async (req, res) => {
            const userId = req.user!.id;
            const apiKeys = await apiKeyModel.findByUserId(userId);

            const publicApiKeys = formatApiKeyToPublic(apiKeys);

            res.respond(200, { api_keys: publicApiKeys });
        },

        create: async (req, res) => {
            const userId = req.user!.id;
            const { name, scopes } = req.body;

            const { document, plainKey } = await apiKeyModel.createApiKey(userId, name, scopes);

            const publicApiKey = formatApiKeyToPublic(document);

            res.respond(201, {
                api_key: publicApiKey,
                plain_key: plainKey
            });
        },

        get: async (req, res) => {
            const userId = req.user!.id;
            const { id } = req.params;

            const apiKey = await apiKeyModel.findById(id);
            if (!apiKey || apiKey.user_id !== userId) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'API key not found'
                });
                return;
            }

            const publicApiKey = formatApiKeyToPublic(apiKey);

            res.respond(200, publicApiKey);
        },

        update: async (req, res) => {
            const userId = req.user!.id;
            const { id } = req.params;
            const { name } = req.body;

            const updatedApiKey = await apiKeyModel.updateName(id, userId, name);
            if (!updatedApiKey) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'API key not found'
                });
                return;
            }

            const publicApiKey = formatApiKeyToPublic(updatedApiKey);

            res.respond(200, publicApiKey);
        },

        revoke: async (req, res) => {
            const userId = req.user!.id;
            const { id } = req.params;

            const revokedApiKey = await apiKeyModel.revokeApiKey(id, userId);
            if (!revokedApiKey) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'API key not found'
                });
                return;
            }

            const publicApiKey = formatApiKeyToPublic(revokedApiKey);

            res.respond(200, publicApiKey);
        },

        stats: async (req, res) => {
            const userId = req.user!.id;
            const stats = await apiKeyModel.getUserApiKeyStats(userId);
            res.respond(200, stats);
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
