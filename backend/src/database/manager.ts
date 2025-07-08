import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export class DatabaseManager {
    private static instance: DatabaseManager;
    private db: Database.Database;
    private readonly dbPath: string;
    private readonly tables: Set<string> = new Set();

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
        this.db.pragma('cache_size = 1000');
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
}

export const db = DatabaseManager.getInstance();
