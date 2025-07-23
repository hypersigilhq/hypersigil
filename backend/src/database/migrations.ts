import { db } from "./manager";
import { migrations } from "./migrations/index";
import { join } from 'path';

export interface Migration {
    version: number;
    name: string;
    up: string;
    down: string;
}

export class MigrationManager {
    private database = db.getDatabase()
    private migrations: Migration[] = migrations

    public async initialize(): Promise<void> {
        this.loadMigrations();
    }

    private loadMigrations(): void {
        console.log('Loading migrations from index', {
            count: this.migrations.length,
            versions: this.migrations.map(m => m.version)
        });

        // Validate migrations
        for (const migration of this.migrations) {
            if (!migration || typeof migration.version !== 'number') {
                throw new Error(`Invalid migration: missing version or invalid format for migration ${migration?.name || 'unknown'}`);
            }
        }

        // Ensure migrations are sorted by version
        this.migrations.sort((a, b) => a.version - b.version);

        console.log('Migrations loaded successfully', {
            count: this.migrations.length,
            versions: this.migrations.map(m => m.version)
        });
    }

    public async runMigrations(): Promise<void> {
        try {
            console.log('Starting database migrations');

            // Ensure schema_migrations table exists
            await this.ensureMigrationTable();

            // Get current version
            const currentVersion = this.getCurrentVersion();
            console.log('Current database version', { version: currentVersion });

            // Run pending migrations
            const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);

            if (pendingMigrations.length === 0) {
                console.log('No pending migrations');
                return;
            }

            console.log('Running migrations', { count: pendingMigrations.length });

            for (const migration of pendingMigrations) {
                await this.runMigration(migration);
            }

            console.log('All migrations completed successfully');
        } catch (error) {
            console.error('Migration failed', {}, error as Error);
            throw error;
        }
    }

    public async rollback(targetVersion: number): Promise<void> {
        try {
            const currentVersion = this.getCurrentVersion();

            if (targetVersion >= currentVersion) {
                console.warn('Target version is not lower than current version', {
                    current: currentVersion,
                    target: targetVersion,
                });
                return;
            }

            const migrationsToRollback = this.migrations
                .filter(m => m.version > targetVersion && m.version <= currentVersion)
                .sort((a, b) => b.version - a.version); // Reverse order for rollback

            console.log('Rolling back migrations', {
                count: migrationsToRollback.length,
                from: currentVersion,
                to: targetVersion,
            });

            for (const migration of migrationsToRollback) {
                await this.rollbackMigration(migration);
            }

            console.log('Rollback completed successfully');
        } catch (error) {
            console.error('Rollback failed', {}, error as Error);
            throw error;
        }
    }

    private async ensureMigrationTable(): Promise<void> {
        // Check if schema_migrations table exists
        const tableExists = this.database
            .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`)
            .get();

        if (!tableExists) {
            // Create the table if it doesn't exist
            this.database.exec(`
                CREATE TABLE schema_migrations (
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Created schema_migrations table');
        }
    }

    private getCurrentVersion(): number {
        try {
            const result = this.database
                .prepare('SELECT MAX(version) as version FROM schema_migrations')
                .get() as { version: number | null };

            return result?.version || 0;
        } catch (error) {
            // If table doesn't exist, return 0
            return 0;
        }
    }

    private async runMigration(migration: Migration): Promise<void> {
        const transaction = this.database.transaction(() => {
            try {
                console.log('Running migration', {
                    version: migration.version,
                    name: migration.name
                });

                // Execute migration SQL
                const result = this.database.exec(migration.up);

                // Record migration
                this.database
                    .prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
                    .run(migration.version, migration.name);

                console.log('Migration completed', {
                    version: migration.version,
                    name: migration.name,

                });
            } catch (error) {
                console.error('Migration failed', {
                    version: migration.version,
                    name: migration.name
                }, error as Error);
                throw error;
            }
        });

        transaction();
    }

    private async rollbackMigration(migration: Migration): Promise<void> {
        const transaction = this.database.transaction(() => {
            try {
                console.log('Rolling back migration', {
                    version: migration.version,
                    name: migration.name
                });

                // Execute rollback SQL
                this.database.exec(migration.down);

                // Remove migration record
                this.database
                    .prepare('DELETE FROM schema_migrations WHERE version = ?')
                    .run(migration.version);

                console.log('Migration rolled back', {
                    version: migration.version,
                    name: migration.name
                });
            } catch (error) {
                console.error('Migration rollback failed', {
                    version: migration.version,
                    name: migration.name
                }, error as Error);
                throw error;
            }
        });

        transaction();
    }

    public getAppliedMigrations(): Array<{ version: number; name: string; applied_at: string }> {
        try {
            return this.database
                .prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version')
                .all() as Array<{ version: number; name: string; applied_at: string }>;
        } catch (error) {
            console.error('Failed to get applied migrations', {}, error as Error);
            return [];
        }
    }

    public getPendingMigrations(): Migration[] {
        const currentVersion = this.getCurrentVersion();
        return this.migrations.filter(m => m.version > currentVersion);
    }

    public getAllMigrations(): Migration[] {
        return [...this.migrations];
    }

    public async createMigration(name: string): Promise<string> {
        // Get the next version number
        const maxVersion = this.migrations.length > 0
            ? Math.max(...this.migrations.map(m => m.version))
            : 0;
        const nextVersion = maxVersion + 1;

        // Format version with leading zeros (e.g., 0001, 0002, etc.)
        const versionString = nextVersion.toString().padStart(4, '0');
        const fileName = `${versionString}_${name.toLowerCase().replace(/\s+/g, '_')}.ts`;
        const filePath = join(__dirname, 'migrations', fileName);

        // Create migration file content
        const migrationContent = `import { Migration } from "../migrations";

export default <Migration>{
    version: ${nextVersion},
    name: '${name}',
    up: \`
        -- Add your migration SQL here
        -- Example: CREATE TABLE example (id INTEGER PRIMARY KEY, name TEXT);
    \`,
    down: \`
        -- Add your rollback SQL here
        -- Example: DROP TABLE IF EXISTS example;
    \`,
}`;

        // Write the file
        const fs = await import('fs/promises');
        await fs.writeFile(filePath, migrationContent);

        console.log(`Migration created: ${fileName}`);
        return filePath;
    }
}

export const migrationManager = new MigrationManager();
