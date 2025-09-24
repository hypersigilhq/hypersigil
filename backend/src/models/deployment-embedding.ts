import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';
import { EmbeddingModels, EmbeddingInputType } from '../workers/workers/generate-embedding';
import { VoyageAIEmbeddingsResult } from '../services/voyageai-api';

// Deployment embedding interface extending BaseDocument
export interface DeploymentEmbedding extends BaseDocument {
    name: string; // slug, unique across the table
    model: EmbeddingModels;
    inputType: EmbeddingInputType;
    webhookDestinationIds?: string[];
}

export class DeploymentEmbeddingModel extends Model<DeploymentEmbedding> {
    protected tableName = 'deployment_embeddings';

    // Custom method to find deployment embedding by name (slug)
    public async findByName(name: string): Promise<DeploymentEmbedding | null> {
        return this.findOne({ name });
    }

    // Create with name uniqueness validation
    public async createWithValidation(data: Omit<DeploymentEmbedding, 'id' | 'created_at' | 'updated_at'>): Promise<Result<DeploymentEmbedding>> {
        // Check if name already exists
        const existing = await this.findByName(data.name);
        if (existing) {
            return Err(`Deployment embedding with name '${data.name}' already exists`);
        }

        const result = await super.create(data);
        return Ok(result);
    }

    // Update with name uniqueness validation
    public async updateWithValidation(id: string, data: Partial<Omit<DeploymentEmbedding, 'id' | 'created_at' | 'updated_at'>>): Promise<Result<DeploymentEmbedding | null>> {
        if (data.name) {
            const existing = await this.findByName(data.name);
            if (existing && existing.id !== id) {
                return Err(`Deployment embedding with name '${data.name}' already exists`);
            }
        }

        const result = await super.update(id, data);
        return Ok(result);
    }

    // Method to get deployment embeddings with pagination and search
    public async findWithSearch(options: {
        page: number;
        limit: number;
        search?: string | undefined;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        data: DeploymentEmbedding[];
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
                JSON_EXTRACT(data, '$.model') LIKE ? OR
                JSON_EXTRACT(data, '$.status') LIKE ?
                ORDER BY ${orderBy === 'created_at' || orderBy === 'updated_at' ? orderBy : `JSON_EXTRACT(data, '$.${orderBy}')`} ${orderDirection}
                LIMIT ? OFFSET ?`;

            const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE
                JSON_EXTRACT(data, '$.name') LIKE ? OR
                JSON_EXTRACT(data, '$.model') LIKE ? OR
                JSON_EXTRACT(data, '$.status') LIKE ?`;

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
export const deploymentEmbeddingModel = new DeploymentEmbeddingModel();
