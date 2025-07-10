import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';

// Test Data Item interface extending BaseDocument
export interface TestDataItem extends BaseDocument {
    group_id: string;
    name?: string;
    content: string;
}

export class TestDataItemModel extends Model<TestDataItem> {
    protected tableName = 'test_data_items';

    // Custom method to find items by group ID
    public async findByGroupId(groupId: string): Promise<TestDataItem[]> {
        return this.findMany({ where: { group_id: groupId } });
    }

    // Custom method to search items by content pattern
    public async searchByContent(pattern: string): Promise<TestDataItem[]> {
        return this.search('content', pattern);
    }

    // Method to get items with pagination and search for a specific group
    public async findByGroupWithSearch(options: {
        groupId: string;
        page: number;
        limit: number;
        search?: string | undefined;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        data: TestDataItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const { groupId, page, limit, search, orderBy = 'created_at', orderDirection = 'DESC' } = options;

        if (search) {
            // Custom search implementation using SQL LIKE for multiple fields within a group
            const sql = `SELECT * FROM ${this.tableName} WHERE 
                JSON_EXTRACT(data, '$.group_id') = ? AND (
                    JSON_EXTRACT(data, '$.name') LIKE ? OR 
                    JSON_EXTRACT(data, '$.content') LIKE ?
                )
                ORDER BY ${orderBy === 'created_at' || orderBy === 'updated_at' ? orderBy : `JSON_EXTRACT(data, '$.${orderBy}')`} ${orderDirection} 
                LIMIT ? OFFSET ?`;

            const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE 
                JSON_EXTRACT(data, '$.group_id') = ? AND (
                    JSON_EXTRACT(data, '$.name') LIKE ? OR 
                    JSON_EXTRACT(data, '$.content') LIKE ?
                )`;

            const offset = (page - 1) * limit;
            const searchPattern = `%${search}%`;

            try {
                // Get total count
                const countStmt = db.getDatabase().prepare(countSql);
                const { total } = countStmt.get(groupId, searchPattern, searchPattern) as { total: number };

                // Get data
                const dataStmt = db.getDatabase().prepare(sql);
                const rows = dataStmt.all(groupId, searchPattern, searchPattern, limit, offset);

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
                console.error('Error in findByGroupWithSearch:', error);
                throw error;
            }
        } else {
            // Use regular pagination with group filter
            return this.findWithPagination({
                page,
                limit,
                orderBy,
                orderDirection,
                where: { group_id: groupId }
            });
        }
    }

    // Method to delete all items in a group (for cascade delete)
    public async deleteByGroupId(groupId: string): Promise<number> {
        return this.deleteMany({ group_id: groupId });
    }

    // Method to count items in a group
    public async countByGroupId(groupId: string): Promise<number> {
        return this.count({ group_id: groupId });
    }

    // Method for bulk create with error handling
    public async bulkCreate(items: Omit<TestDataItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<{
        created: TestDataItem[];
        errors: { index: number; error: string }[];
    }> {
        const created: TestDataItem[] = [];
        const errors: { index: number; error: string }[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                const itemData = items[i];
                if (!itemData) {
                    errors.push({
                        index: i,
                        error: 'Item data is undefined'
                    });
                    continue;
                }
                const item = await this.create(itemData);
                created.push(item);
            } catch (error) {
                errors.push({
                    index: i,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return { created, errors };
    }
}

// Export a singleton instance
export const testDataItemModel = new TestDataItemModel();
