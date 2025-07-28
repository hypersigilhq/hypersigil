import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';

// File interface extending BaseDocument
export interface File extends BaseDocument {
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
    data: string; // base64 encoded file data
    uploadedBy?: string; // user ID who uploaded the file
    description?: string;
    tags?: string[];
}

export class FileModel extends Model<File> {
    protected tableName = 'files';

    // Custom method to find files by name
    public async findByName(name: string): Promise<File | null> {
        return this.findOne({ name });
    }

    // Custom method to find files by original name
    public async findByOriginalName(originalName: string): Promise<File[]> {
        return this.findByProperty('originalName', originalName);
    }

    // Custom method to search files by name pattern
    public async searchByName(pattern: string): Promise<File[]> {
        return this.search('name', pattern);
    }

    // Custom method to find files by tags
    public async findByTag(tag: string): Promise<File[]> {
        const sql = `SELECT * FROM ${this.tableName} WHERE JSON_EXTRACT(data, '$.tags') LIKE ? ORDER BY created_at DESC`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const rows = stmt.all(`%"${tag}"%`);

            return rows.map((row: any) => this.deserializeDocument(row));
        } catch (error) {
            console.error('Error finding files by tag:', error);
            throw error;
        }
    }

    // Custom method to get recent files
    public async getRecent(limit: number = 10): Promise<File[]> {
        return this.findMany({
            orderBy: 'created_at',
            orderDirection: 'DESC',
            limit
        });
    }

    // Method to get files with pagination and search
    public async findWithSearch(options: {
        page: number;
        limit: number;
        search?: string;
        mimeType?: string;
        uploadedBy?: string;
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        data: File[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const { page, limit, search, mimeType, uploadedBy, orderBy = 'created_at', orderDirection = 'DESC' } = options;

        let whereConditions: string[] = [];
        let params: any[] = [];

        if (search) {
            whereConditions.push(`(
                id = ? OR
                JSON_EXTRACT(data, '$.name') LIKE ? OR 
                JSON_EXTRACT(data, '$.originalName') LIKE ? OR
                JSON_EXTRACT(data, '$.description') LIKE ?
            )`);
            const searchPattern = `%${search}%`;
            params.push(search, searchPattern, searchPattern, searchPattern);
        }

        if (mimeType) {
            whereConditions.push(`JSON_EXTRACT(data, '$.mimeType') = ?`);
            params.push(mimeType);
        }

        if (uploadedBy) {
            whereConditions.push(`JSON_EXTRACT(data, '$.uploadedBy') = ?`);
            params.push(uploadedBy);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
        const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
        const countStmt = db.getDatabase().prepare(countSql);
        const { total } = countStmt.get(...params) as { total: number };

        // Get data
        const offset = (page - 1) * limit;
        const orderColumn = orderBy === 'created_at' || orderBy === 'updated_at' ? orderBy : `JSON_EXTRACT(data, '$.${orderBy}')`;
        const dataSql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`;

        const dataStmt = db.getDatabase().prepare(dataSql);
        const rows = dataStmt.all(...params, limit, offset);

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
    }
}

// Export a singleton instance
export const fileModel = new FileModel();
