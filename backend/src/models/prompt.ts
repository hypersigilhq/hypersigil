import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';

// Utility function to recursively add "additionalProperties": false to all objects in a JSON schema
function addAdditionalPropertiesFalse(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => addAdditionalPropertiesFalse(item));
    }

    if (typeof obj === 'object') {
        const result = { ...obj };

        // If this is an object type in JSON schema, add additionalProperties: false
        if (result.type === 'object' && !result.hasOwnProperty('additionalProperties')) {
            result.additionalProperties = false;
        }

        // Recursively process all properties
        for (const key in result) {
            if (result.hasOwnProperty(key)) {
                result[key] = addAdditionalPropertiesFalse(result[key]);
            }
        }

        return result;
    }

    return obj;
}

// Prompt version interface
export interface PromptVersion {
    version: number;
    name: string;
    prompt: string;
    json_schema_response?: object | undefined;
    created_at: Date;
}

// Prompt interface extending BaseDocument
export interface Prompt extends BaseDocument {
    name: string;
    prompt: string;
    json_schema_response?: object | undefined;
    current_version: number;
    versions: PromptVersion[];
}

export class PromptModel extends Model<Prompt> {
    protected tableName = 'prompts';

    // Override create to initialize versioning
    public override async create(data: Omit<Prompt, 'id' | 'created_at' | 'updated_at' | 'current_version' | 'versions'>): Promise<Prompt> {
        const now = new Date();
        const processedSchema = data.json_schema_response ? addAdditionalPropertiesFalse(data.json_schema_response) : undefined;

        const initialVersion: PromptVersion = {
            version: 1,
            name: data.name,
            prompt: data.prompt,
            json_schema_response: processedSchema,
            created_at: now
        };

        const promptData = {
            ...data,
            json_schema_response: processedSchema,
            current_version: 1,
            versions: [initialVersion]
        };

        return super.create(promptData);
    }

    // Override update to handle versioning
    public override async update(id: string, data: Partial<Omit<Prompt, 'id' | 'created_at' | 'current_version' | 'versions'>>): Promise<Prompt | null> {
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }

        // Check if any versionable content changed
        const hasContentChanges =
            (data.name && data.name !== existing.name) ||
            (data.prompt && data.prompt !== existing.prompt) ||
            (data.json_schema_response && JSON.stringify(data.json_schema_response) !== JSON.stringify(existing.json_schema_response));

        if (hasContentChanges) {
            // Create new version
            const newVersion = existing.current_version + 1;
            const processedSchema = data.json_schema_response
                ? addAdditionalPropertiesFalse(data.json_schema_response)
                : existing.json_schema_response;

            const newVersionEntry: PromptVersion = {
                version: newVersion,
                name: data.name || existing.name,
                prompt: data.prompt || existing.prompt,
                json_schema_response: processedSchema,
                created_at: new Date()
            };

            // Update with new version
            const updateData = {
                ...data,
                json_schema_response: data.json_schema_response ? processedSchema : data.json_schema_response,
                current_version: newVersion,
                versions: [...existing.versions, newVersionEntry]
            };

            return super.update(id, updateData);
        } else {
            // No content changes, just update metadata
            return super.update(id, data);
        }
    }

    // Helper method to get a specific version
    public getVersion(prompt: Prompt, version: number): PromptVersion | null {
        return prompt.versions.find(v => v.version === version) || null;
    }

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
        search?: string | undefined;
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
