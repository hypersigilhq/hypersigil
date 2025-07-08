import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';

// Prompt interface extending BaseDocument
export interface Prompt extends BaseDocument {
    name: string;
    prompt: string;
    json_schema_response: object;
}

export class PromptModel extends Model<Prompt> {
    protected tableName = 'prompts';

    // Custom method to find prompts by name
    public async findByName(name: string): Promise<Prompt | null> {
        return this.findOne({ name });
    }

    // Custom method to search prompts by name pattern
    public async searchByName(pattern: string): Promise<Prompt[]> {
        return this.search('name', pattern);
    }

    // Custom method to search prompts by prompt content
    public async searchByPrompt(pattern: string): Promise<Prompt[]> {
        return this.search('prompt', pattern);
    }

    // Custom method to get recent prompts
    public async getRecent(limit: number = 10): Promise<Prompt[]> {
        return this.findMany({
            orderBy: 'created_at',
            orderDirection: 'DESC',
            limit
        });
    }

    // Method to get prompts with pagination and search
    public async findWithSearch(options: {
        page: number;
        limit: number;
        search?: string;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        data: Prompt[];
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
                JSON_EXTRACT(data, '$.prompt') LIKE ? 
                ORDER BY ${orderBy === 'created_at' || orderBy === 'updated_at' ? orderBy : `JSON_EXTRACT(data, '$.${orderBy}')`} ${orderDirection} 
                LIMIT ? OFFSET ?`;

            const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE 
                JSON_EXTRACT(data, '$.name') LIKE ? OR 
                JSON_EXTRACT(data, '$.prompt') LIKE ?`;

            const offset = (page - 1) * limit;
            const searchPattern = `%${search}%`;

            try {
                // Get total count
                const countStmt = db.getDatabase().prepare(countSql);
                const { total } = countStmt.get(searchPattern, searchPattern) as { total: number };

                // Get data
                const dataStmt = db.getDatabase().prepare(sql);
                const rows = dataStmt.all(searchPattern, searchPattern, limit, offset);

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
export const promptModel = new PromptModel();
