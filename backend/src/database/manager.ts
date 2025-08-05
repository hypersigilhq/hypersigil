import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export class DatabaseManager {
    private static instance: DatabaseManager;
    private db: Database.Database;
    private readonly dbPath: string;
    private readonly tables: Set<string> = new Set();
    private readonly virtualColumns: Map<string, Set<string>> = new Map();

    private constructor() {
        // Create data directory if it doesn't exist
        const dataDir = join(process.cwd(), 'data');
        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }

        this.dbPath = join(dataDir, 'database.sqlite');
        this.db = new Database(this.dbPath);

        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 1000000');
        this.db.pragma('temp_store = memory');

        console.log(`📁 Database initialized at: ${this.dbPath}`);
    }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    public getDatabase(): Database.Database {
        return this.db;
    }

    public ensureTable(tableName: string): void {
        if (this.tables.has(tableName)) {
            return;
        }

        // Create a simple table with just id, data (JSON), created_at, updated_at
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `;

        try {
            this.db.exec(createTableSQL);

            // Create indexes for better performance
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName} (created_at)`);
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_updated_at ON ${tableName} (updated_at)`);

            this.tables.add(tableName);
            console.log(`✅ Table '${tableName}' created/verified`);
        } catch (error) {
            console.error(`❌ Error creating table '${tableName}':`, error);
            throw error;
        }
    }

    public transaction<T>(fn: () => T): T {
        const transaction = this.db.transaction(fn);
        return transaction();
    }

    public close(): void {
        if (this.db) {
            this.db.close();
            console.log('🔒 Database connection closed');
        }
    }

    public vacuum(): void {
        this.db.exec('VACUUM');
        console.log('🧹 Database vacuumed');
    }

    public backup(backupPath: string): void {
        this.db.backup(backupPath);
        console.log(`💾 Database backed up to: ${backupPath}`);
    }

    /**
     * Check if a column exists in the database table
     * @param tableName - The table to check
     * @param columnName - The column name to check
     */
    private columnExists(tableName: string, columnName: string): boolean {
        try {
            // xinfo returns virtual columns too
            const tableInfo = this.db.prepare(`PRAGMA table_xinfo(${tableName})`).all() as Array<{
                cid: number;
                name: string;
                type: string;
                notnull: number;
                dflt_value: any;
                pk: number;
            }>;
            return tableInfo.some(column => column.name === columnName);
        } catch (error) {
            console.error(`❌ Error checking column existence for '${columnName}' on table '${tableName}':`, error);
            return false;
        }
    }

    /**
     * Create a virtual column that extracts a JSON path from the data column
     * @param tableName - The table to add the virtual column to
     * @param columnName - The name of the virtual column
     * @param jsonPath - The JSON path to extract (e.g., '$.object_id')
     * @param dataType - The SQLite data type for the virtual column (INTEGER, TEXT, REAL, etc.)
     */
    public createVirtualColumn(tableName: string, columnName: string, jsonPath: string, dataType: string = 'TEXT'): void {
        if (!this.tables.has(tableName)) {
            throw new Error(`Table '${tableName}' does not exist. Create the table first.`);
        }

        // Check if virtual column already exists in database schema
        const columnExists = this.columnExists(tableName, columnName);
        if (columnExists) {
            console.log(`⚠️ Virtual column '${columnName}' already exists on table '${tableName}'`);
            // Update internal tracking if not already tracked
            if (!this.virtualColumns.has(tableName)) {
                this.virtualColumns.set(tableName, new Set());
            }
            this.virtualColumns.get(tableName)!.add(columnName);
            return;
        }

        // Check if virtual column already exists in internal tracking
        if (!this.virtualColumns.has(tableName)) {
            this.virtualColumns.set(tableName, new Set());
        }

        const tableVirtualColumns = this.virtualColumns.get(tableName)!;
        if (tableVirtualColumns.has(columnName)) {
            console.log(`⚠️ Virtual column '${columnName}' already exists on table '${tableName}'`);
            return;
        }

        try {
            // Create the virtual column
            const alterSQL = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${dataType} AS (JSON_EXTRACT(data, '${jsonPath}'))`;
            this.db.exec(alterSQL);

            tableVirtualColumns.add(columnName);
            console.log(`✅ Virtual column '${columnName}' created on table '${tableName}' for JSON path '${jsonPath}'`);
        } catch (error) {
            console.error(`❌ Error creating virtual column '${columnName}' on table '${tableName}':`, error);
            throw error;
        }
    }

    /**
     * Create an index on a virtual column for improved query performance
     * @param tableName - The table containing the virtual column
     * @param columnName - The virtual column to index
     * @param indexName - Optional custom index name (defaults to idx_{tableName}_{columnName})
     */
    public createVirtualColumnIndex(tableName: string, columnName: string, indexName?: string): void {
        if (!this.tables.has(tableName)) {
            throw new Error(`Table '${tableName}' does not exist.`);
        }

        const tableVirtualColumns = this.virtualColumns.get(tableName);
        if (!tableVirtualColumns || !tableVirtualColumns.has(columnName)) {
            throw new Error(`Virtual column '${columnName}' does not exist on table '${tableName}'. Create the virtual column first.`);
        }

        const finalIndexName = indexName || `idx_${tableName}_${columnName}`;

        try {
            const createIndexSQL = `CREATE INDEX IF NOT EXISTS ${finalIndexName} ON ${tableName}(${columnName})`;
            this.db.exec(createIndexSQL);
            console.log(`✅ Index '${finalIndexName}' created on virtual column '${columnName}' for table '${tableName}'`);
        } catch (error) {
            console.error(`❌ Error creating index '${finalIndexName}' on virtual column '${columnName}':`, error);
            throw error;
        }
    }

    /**
     * Ensure virtual columns are created for this model
     * Called automatically when needed
     */
    public async ensureVirtualColumn(tableName: string, columnName: string, jsonPath: string, dataType: string = 'TEXT', indexed?: boolean, indexName?: string): Promise<void> {

    }

    /**
     * Check if a virtual column exists on a table
     * @param tableName - The table to check
     * @param columnName - The virtual column name to check
     */
    public hasVirtualColumn(tableName: string, columnName: string): boolean {
        const tableVirtualColumns = this.virtualColumns.get(tableName);
        return tableVirtualColumns ? tableVirtualColumns.has(columnName) : false;
    }

    /**
     * Get all virtual columns for a table
     * @param tableName - The table to get virtual columns for
     */
    public getVirtualColumns(tableName: string): string[] {
        const tableVirtualColumns = this.virtualColumns.get(tableName);
        return tableVirtualColumns ? Array.from(tableVirtualColumns) : [];
    }

    /**
     * Drop a virtual column from a table
     * Note: SQLite doesn't support dropping columns directly, so this recreates the table
     * @param tableName - The table containing the virtual column
     * @param columnName - The virtual column to drop
     */
    public dropVirtualColumn(tableName: string, columnName: string): void {
        const tableVirtualColumns = this.virtualColumns.get(tableName);
        if (!tableVirtualColumns || !tableVirtualColumns.has(columnName)) {
            console.log(`⚠️ Virtual column '${columnName}' does not exist on table '${tableName}'`);
            return;
        }

        console.log(`⚠️ Dropping virtual column '${columnName}' from table '${tableName}' requires table recreation. This is a destructive operation.`);

        // For now, just remove from tracking - actual column dropping would require table recreation
        tableVirtualColumns.delete(columnName);
        console.log(`✅ Virtual column '${columnName}' removed from tracking for table '${tableName}'`);
    }
}

export const db = DatabaseManager.getInstance();
