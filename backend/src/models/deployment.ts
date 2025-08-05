import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';
import { AIProviderName } from '../providers/base-provider';

// Deployment options interface
export interface DeploymentOptions {
    temperature?: number;
    topP?: number;
    topK?: number;
}

// Deployment interface extending BaseDocument
export interface Deployment extends BaseDocument {
    name: string; // slug, unique across the table
    promptId: string;
    promptVersion: number;
    provider: AIProviderName;
    model: string;
    options?: DeploymentOptions;
    webhookDestinationIds?: string[];
}
export class DeploymentModel extends Model<Deployment> {
    protected tableName = 'deployments';

    // Custom method to find deployment by name (slug)
    public async findByName(name: string): Promise<Deployment | null> {
        return this.findOne({ name });
    }

    // Custom method to find deployments by promptId
    public async findByPromptId(promptId: string): Promise<Deployment[]> {
        return this.findMany({ where: { promptId } });
    }

    // Custom method to find deployments by provider
    public async findByProvider(provider: string): Promise<Deployment[]> {
        return this.findMany({ where: { provider } });
    }

    // Create with name uniqueness validation
    public async createWithValidation(data: Omit<Deployment, 'id' | 'created_at' | 'updated_at'>): Promise<Result<Deployment>> {
        // Check if name already exists
        const existing = await this.findByName(data.name);
        if (existing) {
            return Err(`Deployment with name '${data.name}' already exists`);
        }

        const result = await super.create(data);
        return Ok(result);
    }

    // Update with name uniqueness validation
    public async updateWithValidation(id: string, data: Partial<Omit<Deployment, 'id' | 'created_at' | 'updated_at'>>): Promise<Result<Deployment | null>> {
        if (data.name) {
            const existing = await this.findByName(data.name);
            if (existing && existing.id !== id) {
                return Err(`Deployment with name '${data.name}' already exists`);
            }
        }

        const result = await super.update(id, data);
        return Ok(result);
    }

    // Method to get deployments with pagination and search
    public async findWithSearch(options: {
        page: number;
        limit: number;
        search?: string | undefined;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        data: Deployment[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const { page, limit, search, orderBy = 'created_at', orderDirection = 'DESC' } = options;

        if (search) {
            // Custom search implementation using SQL LIKE for multiple fields
            const sql = `SELECT * FROM ${this.tableName} WHERE 
                JSON_EXTRACT(data, '$.name') LIKE ? OR 
                JSON_EXTRACT(data, '$.provider') LIKE ? OR 
                JSON_EXTRACT(data, '$.model') LIKE ?
                ORDER BY ${orderBy === 'created_at' || orderBy === 'updated_at' ? orderBy : `JSON_EXTRACT(data, '$.${orderBy}')`} ${orderDirection} 
                LIMIT ? OFFSET ?`;

            const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE 
                JSON_EXTRACT(data, '$.name') LIKE ? OR 
                JSON_EXTRACT(data, '$.provider') LIKE ? OR 
                JSON_EXTRACT(data, '$.model') LIKE ?`;

            const offset = (page - 1) * limit;
            const searchPattern = `%${search}%`;

            try {
                // Get total count
                const countStmt = db.getDatabase().prepare(countSql);
                const { total } = countStmt.get(searchPattern, searchPattern, searchPattern) as { total: number };

                // Get data
                const dataStmt = db.getDatabase().prepare(sql);
                const rows = dataStmt.all(searchPattern, searchPattern, searchPattern, limit, offset);

                const data = rows.map((row: any) => this.deserializeDocument(row));
                const totalPages = Math.ceil(total / limit);

                return {
                    data,
                    total,
                    page,
                    limit,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                };
            } catch (error) {
                console.error('Error in findWithSearch:', error);
                throw error;
            }
        } else {
            // Use regular pagination
            return this.findWithPagination({
                page,
                limit,
                orderBy,
                orderDirection
            });
        }
    }
}

// Export a singleton instance
export const deploymentModel = new DeploymentModel();
