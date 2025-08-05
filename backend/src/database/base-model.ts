import { randomUUID } from 'crypto';
import { db } from './manager';
import { BaseDocument, QueryOptions, PaginationResult, WhereClause } from './types';
import { modelRegistry } from './model-registry';

export interface VirtualColumnDefinition {
    columnName: string;
    jsonPath: string;
    dataType: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
    indexed?: boolean;
    indexName?: string;
}

export abstract class Model<T extends BaseDocument> {
    protected abstract tableName: string;
    private _isRegistered = false;
    protected virtualColumns: VirtualColumnDefinition[] = [];

    constructor() {
        // Registration will happen on first method call that needs the table
        // This is necessary because abstract properties aren't available in constructor
    }

    /**
     * Ensure this model is registered with the registry
     * Called automatically before any database operations
     */
    public ensureRegistered(virtualColumns?: VirtualColumnDefinition[]): void {
        if (!this._isRegistered) {
            if (virtualColumns) {
                this.virtualColumns = virtualColumns;
            }
            const modelName = this.constructor.name;
            modelRegistry.registerModel(modelName, this.tableName, this.virtualColumns);
            this._isRegistered = true;
        }
    }

    protected serializeDocument(doc: T): string {
        // Remove id, created_at, updated_at from the data field since they're stored separately
        const { id, created_at, updated_at, ...data } = doc;
        return JSON.stringify(data);
    }

    protected deserializeDocument(row: any): T {
        const data = JSON.parse(row.data);
        const document = {
            id: row.id,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            ...data
        } as T;

        // Auto-convert date fields based on common naming patterns
        this.convertDateFields(document);

        return document;
    }

    /**
     * Automatically converts string date fields to Date objects based on field names
     * Override this method in subclasses to specify custom date field patterns
     */
    protected convertDateFields(document: T): void {
        const dateFieldPatterns = [
            /_at$/,     // ends with _at (started_at, completed_at, etc.)
            /_date$/,   // ends with _date
            /^date_/,   // starts with date_
            /timestamp/, // contains timestamp
            /^last_/,
            /_until$/
        ];
        for (const [key, value] of Object.entries(document)) {
            if (value && typeof value === 'string' && this.isDateField(key, dateFieldPatterns)) {
                try {
                    const dateValue = new Date(value);
                    if (!isNaN(dateValue.getTime())) {
                        (document as any)[key] = dateValue;
                    }
                } catch (error) {
                    // Ignore conversion errors, keep original value
                }
            }

            if (value && typeof value === 'object') {
                this.convertDateFields(value)
            }
        }
    }

    /**
     * Checks if a field name matches date field patterns
     */
    private isDateField(fieldName: string, patterns: RegExp[]): boolean {
        return patterns.some(pattern => pattern.test(fieldName));
    }

    protected buildWhereClause(where: WhereClause): { clause: string; params: any[] } {
        if (!where || Object.keys(where).length === 0) {
            return { clause: '', params: [] };
        }

        const conditions: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(where)) {
            if (key === 'id') {
                // Direct column access for id
                if (Array.isArray(value)) {
                    const placeholders = value.map(() => '?').join(', ');
                    conditions.push(`id IN (${placeholders})`);
                    params.push(...value);
                } else {
                    conditions.push('id = ?');
                    params.push(value);
                }
            } else if (key === 'created_at' || key === 'updated_at') {
                // Direct column access for timestamps
                conditions.push(`${key} = ?`);
                params.push(value instanceof Date ? value.toISOString() : value);
            } else {
                // JSON path query for nested properties
                if (Array.isArray(value)) {
                    const placeholders = value.map(() => 'JSON_EXTRACT(data, ?) = ?').join(' OR ');
                    conditions.push(`(${placeholders})`);
                    for (const v of value) {
                        params.push(`$.${key}`, v);
                    }
                } else {
                    conditions.push('JSON_EXTRACT(data, ?) = ?');
                    if (typeof value === 'boolean') {
                        params.push(`$.${key}`, value === true ? 1 : 0);
                    } else {
                        params.push(`$.${key}`, value);
                    }
                }
            }
        }

        return {
            clause: `WHERE ${conditions.join(' AND ')}`,
            params
        };
    }

    public async create(data: Omit<T, 'created_at' | 'updated_at'>): Promise<T> {

        const now = new Date();
        const id = data.id || randomUUID();

        const fullDoc = {
            ...data,
            id,
            created_at: now,
            updated_at: now
        } as T;

        const serializedData = this.serializeDocument(fullDoc);

        const sql = `INSERT INTO ${this.tableName} (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            stmt.run(id, serializedData, now.toISOString(), now.toISOString());

            return this.findById(id) as Promise<T>;
        } catch (error) {
            console.error(`Error creating document in ${this.tableName}:`, error);
            throw error;
        }
    }

    public async findById(id: string): Promise<T | null> {

        const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const row = stmt.get(id);

            return row ? this.deserializeDocument(row) : null;
        } catch (error) {
            console.error(`Error finding document by id in ${this.tableName}:`, error);
            throw error;
        }
    }

    public async findOne(where: WhereClause): Promise<T | null> {
        const { clause, params } = this.buildWhereClause(where);
        const sql = `SELECT * FROM ${this.tableName} ${clause} LIMIT 1`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const row = stmt.get(...params);

            return row ? this.deserializeDocument(row) : null;
        } catch (error) {
            console.error(`Error finding document in ${this.tableName}:`, error);
            throw error;
        }
    }

    public async findMany(options: QueryOptions & { where?: WhereClause } = {}): Promise<T[]> {
        const { where, orderBy = 'created_at', orderDirection = 'DESC', limit, offset } = options;

        let sql = `SELECT * FROM ${this.tableName}`;
        const params: any[] = [];

        if (where) {
            const { clause, params: whereParams } = this.buildWhereClause(where);
            sql += ` ${clause}`;
            params.push(...whereParams);
        }

        // Handle ordering - if it's a JSON field, use JSON_EXTRACT
        if (orderBy === 'id' || orderBy === 'created_at' || orderBy === 'updated_at') {
            sql += ` ORDER BY ${orderBy} ${orderDirection}`;
        } else {
            sql += ` ORDER BY JSON_EXTRACT(data, '$.${orderBy}') ${orderDirection}`;
        }

        if (limit) {
            sql += ` LIMIT ?`;
            params.push(limit);
        }

        if (offset) {
            sql += ` OFFSET ?`;
            params.push(offset);
        }

        try {
            const stmt = db.getDatabase().prepare(sql);
            const rows = stmt.all(...params);

            return rows.map(row => this.deserializeDocument(row));
        } catch (error) {
            console.error(`Error finding documents in ${this.tableName}:`, error);
            throw error;
        }
    }

    public async findWithPagination(options: QueryOptions & { page: number; limit: number; where?: WhereClause }): Promise<PaginationResult<T>> {
        const { page, limit, where, orderBy = 'created_at', orderDirection = 'DESC' } = options;
        const offset = (page - 1) * limit;

        // Get total count
        let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
        const countParams: any[] = [];

        if (where) {
            const { clause, params: whereParams } = this.buildWhereClause(where);
            countSql += ` ${clause}`;
            countParams.push(...whereParams);
        }

        const countStmt = db.getDatabase().prepare(countSql);
        const { total } = countStmt.get(...countParams) as { total: number };

        // Get data
        const findOptions: QueryOptions & { where?: WhereClause } = {
            orderBy,
            orderDirection,
            limit,
            offset
        };

        if (where) {
            findOptions.where = where;
        }

        const data = await this.findMany(findOptions);

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

    public async update(id: string, data: Partial<Omit<T, 'id' | 'created_at'>>): Promise<T | null> {
        // First get the existing document
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }

        // Merge the updates with existing data
        const updatedDoc = {
            ...existing,
            ...data,
            updated_at: new Date()
        } as T;

        const serializedData = this.serializeDocument(updatedDoc);

        const sql = `UPDATE ${this.tableName} SET data = ?, updated_at = ? WHERE id = ?`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const result = stmt.run(serializedData, updatedDoc.updated_at!.toISOString(), id);

            if (result.changes === 0) {
                return null;
            }

            return this.findById(id);
        } catch (error) {
            console.error(`Error updating document in ${this.tableName}:`, error);
            throw error;
        }
    }

    public async delete(id: string): Promise<boolean> {
        const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const result = stmt.run(id);

            return result.changes > 0;
        } catch (error) {
            console.error(`Error deleting document from ${this.tableName}:`, error);
            throw error;
        }
    }

    public async deleteMany(where: WhereClause): Promise<number> {
        const { clause, params } = this.buildWhereClause(where);
        const sql = `DELETE FROM ${this.tableName} ${clause}`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const result = stmt.run(...params);

            return result.changes;
        } catch (error) {
            console.error(`Error deleting documents from ${this.tableName}:`, error);
            throw error;
        }
    }

    public async count(where?: WhereClause): Promise<number> {
        let sql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
        const params: any[] = [];

        if (where) {
            const { clause, params: whereParams } = this.buildWhereClause(where);
            sql += ` ${clause}`;
            params.push(...whereParams);
        }

        try {
            const stmt = db.getDatabase().prepare(sql);
            const { total } = stmt.get(...params) as { total: number };

            return total;
        } catch (error) {
            console.error(`Error counting documents in ${this.tableName}:`, error);
            throw error;
        }
    }

    public async findAll(offset: number = 0, limit: number = 0): Promise<T[]> {
        return this.findMany({ limit, offset })
    }

    // New method for finding by any property
    public async findByProperty(property: string, value: any): Promise<T[]> {
        return this.findMany({ where: { [property]: value } });
    }

    // New method for searching with LIKE operator (for text fields)
    public async search(property: string, pattern: string): Promise<T[]> {
        const sql = `SELECT * FROM ${this.tableName} WHERE JSON_EXTRACT(data, ?) LIKE ? ORDER BY created_at DESC`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const rows = stmt.all(`$.${property}`, `%${pattern}%`);

            return rows.map(row => this.deserializeDocument(row));
        } catch (error) {
            console.error(`Error searching documents in ${this.tableName}:`, error);
            throw error;
        }
    }

    // New method for complex JSON queries
    public async findByJsonPath(jsonPath: string, value: any): Promise<T[]> {
        const sql = `SELECT * FROM ${this.tableName} WHERE JSON_EXTRACT(data, ?) = ? ORDER BY created_at DESC`;

        try {
            const stmt = db.getDatabase().prepare(sql);
            const rows = stmt.all(jsonPath, value);

            return rows.map(row => this.deserializeDocument(row));
        } catch (error) {
            console.error(`Error finding documents by JSON path in ${this.tableName}:`, error);
            throw error;
        }
    }

    // Method for updating multiple JSON properties using SQLite JSON_SET
    public async updateJsonProperties(id: string, properties: Record<string, any>): Promise<T | null> {
        // Check if document exists
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }

        const propertyKeys = Object.keys(properties);
        if (propertyKeys.length === 0) {
            return existing;
        }

        // Build the SQL query using chained JSON_SET calls
        const params: any[] = [new Date().toISOString()];
        let dataUpdate = 'data';

        // Chain JSON_SET calls for each property
        for (const key of propertyKeys) {
            const value = properties[key];

            if (value === null || value === undefined) {
                // Handle null values directly
                dataUpdate = `JSON_SET(${dataUpdate}, ?, NULL)`;
                params.push(`$.${key}`);
            } else {
                // Use SQLite's json() function to properly handle JSON values
                dataUpdate = `JSON_SET(${dataUpdate}, ?, json(?))`;
                params.push(`$.${key}`, JSON.stringify(value));
            }
        }

        const sql = `UPDATE ${this.tableName} SET updated_at = ?, data = ${dataUpdate} WHERE id = ?`;
        params.push(id);

        try {
            const stmt = db.getDatabase().prepare(sql);
            const result = stmt.run(...params);

            if (result.changes === 0) {
                return null;
            }

            return this.findById(id);
        } catch (error) {
            console.error(`Error updating JSON properties in ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Enhanced buildWhereClause that can use virtual columns for better performance
     */
    protected buildOptimizedWhereClause(where: WhereClause): { clause: string; params: any[] } {
        if (!where || Object.keys(where).length === 0) {
            return { clause: '', params: [] };
        }

        const conditions: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(where)) {
            if (key === 'id') {
                // Direct column access for id
                if (Array.isArray(value)) {
                    const placeholders = value.map(() => '?').join(', ');
                    conditions.push(`id IN (${placeholders})`);
                    params.push(...value);
                } else {
                    conditions.push('id = ?');
                    params.push(value);
                }
            } else if (key === 'created_at' || key === 'updated_at') {
                // Direct column access for timestamps
                conditions.push(`${key} = ?`);
                params.push(value instanceof Date ? value.toISOString() : value);
            } else {
                // Check if we have a virtual column for this field
                const virtualColumn = this.virtualColumns.find(vc =>
                    vc.jsonPath === `$.${key}` || vc.columnName === key
                );

                if (virtualColumn && db.hasVirtualColumn(this.tableName, virtualColumn.columnName)) {
                    // Use virtual column for better performance
                    if (Array.isArray(value)) {
                        const placeholders = value.map(() => '?').join(', ');
                        conditions.push(`${virtualColumn.columnName} IN (${placeholders})`);
                        params.push(...value);
                    } else {
                        conditions.push(`${virtualColumn.columnName} = ?`);
                        if (typeof value === 'boolean') {
                            params.push(value === true ? 1 : 0);
                        } else {
                            params.push(value);
                        }
                    }
                } else {
                    // Fall back to JSON_EXTRACT
                    if (Array.isArray(value)) {
                        const placeholders = value.map(() => 'JSON_EXTRACT(data, ?) = ?').join(' OR ');
                        conditions.push(`(${placeholders})`);
                        for (const v of value) {
                            params.push(`$.${key}`, v);
                        }
                    } else {
                        conditions.push('JSON_EXTRACT(data, ?) = ?');
                        if (typeof value === 'boolean') {
                            params.push(`$.${key}`, value === true ? 1 : 0);
                        } else {
                            params.push(`$.${key}`, value);
                        }
                    }
                }
            }
        }

        return {
            clause: `WHERE ${conditions.join(' AND ')}`,
            params
        };
    }

    /**
     * Enhanced findMany that uses virtual columns when available
     */
    public async findManyOptimized(options: QueryOptions & { where?: WhereClause } = {}): Promise<T[]> {

        const { where, orderBy = 'created_at', orderDirection = 'DESC', limit, offset } = options;

        let sql = `SELECT * FROM ${this.tableName}`;
        const params: any[] = [];

        if (where) {
            const { clause, params: whereParams } = this.buildOptimizedWhereClause(where);
            sql += ` ${clause}`;
            params.push(...whereParams);
        }

        // Handle ordering - check for virtual columns first
        if (orderBy === 'id' || orderBy === 'created_at' || orderBy === 'updated_at') {
            sql += ` ORDER BY ${orderBy} ${orderDirection}`;
        } else {
            const virtualColumn = this.virtualColumns.find(vc =>
                vc.jsonPath === `$.${orderBy}` || vc.columnName === orderBy
            );

            if (virtualColumn && db.hasVirtualColumn(this.tableName, virtualColumn.columnName)) {
                sql += ` ORDER BY ${virtualColumn.columnName} ${orderDirection}`;
            } else {
                sql += ` ORDER BY JSON_EXTRACT(data, '$.${orderBy}') ${orderDirection}`;
            }
        }

        if (limit) {
            sql += ` LIMIT ?`;
            params.push(limit);
        }

        if (offset) {
            sql += ` OFFSET ?`;
            params.push(offset);
        }

        try {
            const stmt = db.getDatabase().prepare(sql);
            const rows = stmt.all(...params);

            return rows.map(row => this.deserializeDocument(row));
        } catch (error) {
            console.error(`Error finding documents in ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Enhanced findWithPagination that uses virtual columns when available
     */
    public async findWithPaginationOptimized(options: QueryOptions & { page: number; limit: number; where?: WhereClause }): Promise<PaginationResult<T>> {
        const { page, limit, where, orderBy = 'created_at', orderDirection = 'DESC' } = options;
        const offset = (page - 1) * limit;

        // Get total count using optimized where clause
        let countSql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
        const countParams: any[] = [];

        if (where) {
            const { clause, params: whereParams } = this.buildOptimizedWhereClause(where);
            countSql += ` ${clause}`;
            countParams.push(...whereParams);
        }

        const countStmt = db.getDatabase().prepare(countSql);
        const { total } = countStmt.get(...countParams) as { total: number };

        // Get data using optimized method
        const findOptions: QueryOptions & { where?: WhereClause } = {
            orderBy,
            orderDirection,
            limit,
            offset
        };

        if (where) {
            findOptions.where = where;
        }

        const data = await this.findManyOptimized(findOptions);

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

    /**
     * Get all virtual columns for this model
     */
    public getVirtualColumns(): string[] {
        return db.getVirtualColumns(this.tableName);
    }
}
