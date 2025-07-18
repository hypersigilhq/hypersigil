import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';

// Test Data Group interface extending BaseDocument
export interface TestDataGroup extends BaseDocument {
    name: string;
    description?: string;
    mode: "raw" | "json";
}

export class TestDataGroupModel extends Model<TestDataGroup> {
    protected tableName = 'test_data_groups';

    // Custom method to find groups by name
    public async findByName(name: string): Promise<TestDataGroup | null> {
        return this.findOne({ name });
    }

    // Custom method to search groups by name pattern
    public async searchByName(pattern: string): Promise<TestDataGroup[]> {
        return this.search('name', pattern);
    }

    // Method to get groups with pagination and search
    public async findWithSearch(options: {
        page: number;
        limit: number;
        search?: string | undefined;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        data: TestDataGroup[];
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
                JSON_EXTRACT(data, '$.description') LIKE ? 
                ORDER BY ${orderBy === 'created_at' || orderBy === 'updated_at' ? orderBy : `JSON_EXTRACT(data, '$.${orderBy}')`} ${orderDirection} 
                LIMIT ? OFFSET ?`;

            const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE 
                JSON_EXTRACT(data, '$.name') LIKE ? OR 
                JSON_EXTRACT(data, '$.description') LIKE ?`;

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
export const testDataGroupModel = new TestDataGroupModel();
