import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';

export type Permission =
    | "executions:run" | "executions:read"
    | "prompts:preview" | "prompts:read"

export interface ApiKeyDocument extends BaseDocument {
    name: string;
    key_hash: string;
    key_prefix: string;
    user_id: string;
    permissions: {
        scopes: Permission[];
    };
    status: 'active' | 'revoked';
    usage_stats: {
        total_requests: number;
        last_used_at?: Date;
        last_ip?: string;
    };
}

export class ApiKeyModel extends Model<ApiKeyDocument> {
    protected tableName = 'api_keys';
    private static readonly BCRYPT_ROUNDS = 12;

    /**
     * Generate a new API key
     */
    private generateApiKey(): string {
        const randomPart = randomBytes(32).toString('hex');
        return `api_${randomPart}`;
    }

    /**
     * Hash API key using bcrypt
     */
    private async hashApiKey(apiKey: string): Promise<string> {
        return bcrypt.hash(apiKey, ApiKeyModel.BCRYPT_ROUNDS);
    }

    /**
     * Verify API key against hash
     */
    private async verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
        return bcrypt.compare(apiKey, hash);
    }

    /**
     * Create a new API key
     */
    async createApiKey(
        userId: string,
        name: string,
        scopes: Permission[] = ['executions:run']
    ): Promise<{ document: ApiKeyDocument; plainKey: string }> {
        const plainKey = this.generateApiKey();
        const keyHash = await this.hashApiKey(plainKey);
        const keyPrefix = plainKey.substring(0, 16); // Show first 16 chars as prefix

        const createData: Omit<ApiKeyDocument, 'id' | 'created_at' | 'updated_at'> = {
            name,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            user_id: userId,
            permissions: {
                scopes
            },
            status: 'active',
            usage_stats: {
                total_requests: 0
            }
        };

        const document = await this.create(createData);
        return { document, plainKey };
    }

    /**
     * Find API key by the actual key value
     */
    async findByApiKey(apiKey: string): Promise<ApiKeyDocument | null> {
        // Get all active API keys and check each one
        const activeKeys = await this.findMany({ where: { status: 'active' } });

        for (const keyDoc of activeKeys) {
            const isValid = await this.verifyApiKey(apiKey, keyDoc.key_hash);
            if (isValid) {
                return keyDoc;
            }
        }

        return null;
    }

    /**
     * Find API keys by user ID
     */
    async findByUserId(userId: string): Promise<ApiKeyDocument[]> {
        return this.findMany({ where: { user_id: userId }, orderBy: 'created_at', orderDirection: 'DESC' });
    }

    /**
     * Find active API keys by user ID
     */
    async findActiveByUserId(userId: string): Promise<ApiKeyDocument[]> {
        return this.findMany({
            where: { user_id: userId, status: 'active' },
            orderBy: 'created_at',
            orderDirection: 'DESC'
        });
    }

    /**
     * Revoke an API key
     */
    async revokeApiKey(keyId: string, userId: string): Promise<ApiKeyDocument | null> {
        const apiKey = await this.findById(keyId);
        if (!apiKey || apiKey.user_id !== userId) {
            return null;
        }

        return this.update(keyId, { status: 'revoked' });
    }

    /**
     * Update API key usage statistics
     */
    async recordUsage(keyId: string, ipAddress?: string): Promise<ApiKeyDocument | null> {
        const apiKey = await this.findById(keyId);
        if (!apiKey) {
            return null;
        }

        const updatedStats = {
            total_requests: apiKey.usage_stats.total_requests + 1,
            last_used_at: new Date(),
            ...(ipAddress && { last_ip: ipAddress })
        };

        return this.update(keyId, { usage_stats: updatedStats });
    }

    /**
     * Check if API key has specific scope
     */
    hasScope(apiKey: ApiKeyDocument, requiredScope: Permission): boolean {
        return apiKey.permissions.scopes.includes(requiredScope);
    }

    /**
     * Update API key name
     */
    async updateName(keyId: string, userId: string, newName: string): Promise<ApiKeyDocument | null> {
        const apiKey = await this.findById(keyId);
        if (!apiKey || apiKey.user_id !== userId) {
            return null;
        }

        return this.update(keyId, { name: newName });
    }

    /**
     * Get usage statistics for user's API keys
     */
    async getUserApiKeyStats(userId: string): Promise<{
        total_keys: number;
        active_keys: number;
        revoked_keys: number;
        total_requests: number;
    }> {
        const userKeys = await this.findByUserId(userId);

        const stats = {
            total_keys: userKeys.length,
            active_keys: userKeys.filter(k => k.status === 'active').length,
            revoked_keys: userKeys.filter(k => k.status === 'revoked').length,
            total_requests: userKeys.reduce((sum, k) => sum + k.usage_stats.total_requests, 0)
        };

        return stats;
    }
}

// Export singleton instance
export const apiKeyModel = new ApiKeyModel();
