# Multi-Tenant Architecture with Hybrid Database Strategy

## Overview

A flexible multi-tenant architecture that allows choosing between database isolation and table isolation strategies per model. This hybrid approach provides complete data isolation where needed (large data models) while maintaining shared infrastructure for cross-tenant operations (user management, settings).

## Current System Analysis

### Existing Infrastructure
- **Single SQLite Database**: All data stored in `backend/data/database.sqlite`
- **JSON Document Storage**: Generic table structure with `id`, `data`, `created_at`, `updated_at`
- **Base Model System**: Abstract model class with CRUD operations and JSON querying
- **Migration System**: Schema versioning and migration management
- **User Authentication**: Existing user model and authentication system

### Limitations for Multi-tenancy
- No tenant isolation at database or table level
- All users and data mixed in single database
- No tenant-scoped access controls
- Risk of cross-tenant data leaks

## Hybrid Multi-Tenant Architecture

### 1. Database Strategy Options

The system supports three isolation strategies:

1. **Shared Database with tenant_id** - Table-level isolation for metadata and cross-tenant operations
2. **Isolated Database per Tenant** - Complete database isolation for large data and sensitive information
3. **System Database** - Global data that doesn't belong to any tenant

### 2. Core Components

#### Hybrid Database Manager

**File**: `backend/src/database/hybrid-manager.ts`

```typescript
export type DatabaseStrategy = 'shared' | 'isolated';

export class HybridDatabaseManager {
    private static instance: HybridDatabaseManager;
    private sharedDb: Database.Database;
    private tenantDatabases: Map<string, Database.Database> = new Map();
    private readonly dataDir: string;

    private constructor() {
        this.dataDir = join(process.cwd(), 'data');
        this.sharedDb = this.createDatabase('shared.sqlite');
    }

    public static getInstance(): HybridDatabaseManager {
        if (!HybridDatabaseManager.instance) {
            HybridDatabaseManager.instance = new HybridDatabaseManager();
        }
        return HybridDatabaseManager.instance;
    }

    // Get shared database (for tenant-aware models)
    public getSharedDatabase(): Database.Database {
        return this.sharedDb;
    }

    // Get isolated tenant database
    public getTenantDatabase(tenantId: string): Database.Database {
        if (!this.tenantDatabases.has(tenantId)) {
            const filename = `tenant_${tenantId}.sqlite`;
            const db = this.createDatabase(filename);
            this.tenantDatabases.set(tenantId, db);
        }
        return this.tenantDatabases.get(tenantId)!;
    }

    // Get database based on strategy
    public getDatabase(strategy: DatabaseStrategy, tenantId?: string): Database.Database {
        switch (strategy) {
            case 'shared':
                return this.getSharedDatabase();
            case 'isolated':
                if (!tenantId) {
                    throw new Error('Tenant ID required for isolated database strategy');
                }
                return this.getTenantDatabase(tenantId);
        }
    }
}
```

#### Tenant Context Management

**File**: `backend/src/database/tenant-context.ts`

```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
    tenantId: string;
    database: Database.Database;
}

class TenantContextManager {
    private asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

    // Set tenant context for current request
    public setContext(tenantId: string): void {
        const database = connectionProvider.getTenantConnection(tenantId);
        const context: TenantContext = { tenantId, database };
        this.asyncLocalStorage.enterWith(context);
    }

    // Get current tenant context
    public getCurrentTenantId(): string {
        const context = this.asyncLocalStorage.getStore();
        if (!context) {
            throw new Error('No tenant context found. Ensure tenant middleware is properly configured.');
        }
        return context.tenantId;
    }

    // Run function with specific tenant context
    public async runWithTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
        const database = connectionProvider.getTenantConnection(tenantId);
        const context: TenantContext = { tenantId, database };
        
        return new Promise((resolve, reject) => {
            this.asyncLocalStorage.run(context, async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
}

export const tenantContext = new TenantContextManager();
```

### 3. Base Model Architecture

#### Abstract Base Model (Common CRUD Logic)

**File**: `backend/src/database/base-model.ts`

```typescript
export abstract class Model<T extends BaseDocument> {
    protected abstract tableName: string;

    // Abstract methods that subclasses must implement
    protected abstract getDatabase(): any;
    protected abstract buildWhereClause(where?: WhereClause): { clause: string; params: any[] };
    protected abstract serializeForInsert(doc: T): { columns: string; placeholders: string; values: any[] };
    protected abstract deserializeDocument(row: any): T;
    public abstract ensureTable(): void;

    // Common CRUD operations
    public async create(data: any): Promise<T> {
        const now = new Date();
        const id = randomUUID();
        const db = this.getDatabase();

        const fullDoc = { ...data, id, created_at: now, updated_at: now } as T;
        const { columns, placeholders, values } = this.serializeForInsert(fullDoc);
        const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

        const stmt = db.prepare(sql);
        stmt.run(...values);
        return this.findById(id) as Promise<T>;
    }

    public async findById(id: string): Promise<T | null> {
        const { clause, params } = this.buildWhereClause({ id });
        const sql = `SELECT * FROM ${this.tableName} ${clause}`;
        const db = this.getDatabase();

        const stmt = db.prepare(sql);
        const row = stmt.get(...params);
        return row ? this.deserializeDocument(row) : null;
    }

    // ... other common CRUD methods (findOne, findMany, update, delete, count)
}
```

#### Shared Model (Table Isolation with tenant_id)

**File**: `backend/src/database/shared-model.ts`

```typescript
export interface SharedDocument extends BaseDocument {
    tenant_id: string;
}

export abstract class SharedModel<T extends SharedDocument> extends Model<T> {
    protected getDatabase() {
        return hybridManager.getSharedDatabase();
    }

    public ensureTable(): void {
        const db = this.getDatabase();
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `;

        db.exec(createTableSQL);
        // Create tenant-optimized indexes
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tenant_id ON ${this.tableName} (tenant_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tenant_created ON ${this.tableName} (tenant_id, created_at)`);
    }

    protected serializeForInsert(doc: T): { columns: string; placeholders: string; values: any[] } {
        const tenantId = tenantContext.getCurrentTenantId();
        const serializedData = this.serializeDocument(doc);
        
        return {
            columns: 'id, data, tenant_id, created_at, updated_at',
            placeholders: '?, ?, ?, ?, ?',
            values: [doc.id, serializedData, tenantId, doc.created_at!.toISOString(), doc.updated_at!.toISOString()]
        };
    }

    protected buildWhereClause(where: WhereClause = {}): { clause: string; params: any[] } {
        // Always add tenant filtering
        const tenantWhere = { ...where, tenant_id: tenantContext.getCurrentTenantId() };
        // ... build WHERE clause with tenant_id filter
    }

    protected deserializeDocument(row: any): T {
        const data = JSON.parse(row.data);
        return {
            id: row.id,
            tenant_id: row.tenant_id,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            ...data
        } as T;
    }
}
```

#### Isolated Model (Database Isolation)

**File**: `backend/src/database/isolated-model.ts`

```typescript
export abstract class IsolatedModel<T extends BaseDocument> extends Model<T> {
    protected getDatabase() {
        const tenantId = tenantContext.getCurrentTenantId();
        return hybridManager.getTenantDatabase(tenantId);
    }

    public ensureTable(): void {
        const db = this.getDatabase();
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `;

        db.exec(createTableSQL);
        // Standard indexes (no tenant_id needed)
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_created_at ON ${this.tableName} (created_at)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_updated_at ON ${this.tableName} (updated_at)`);
    }

    protected serializeForInsert(doc: T): { columns: string; placeholders: string; values: any[] } {
        const serializedData = this.serializeDocument(doc);
        
        return {
            columns: 'id, data, created_at, updated_at',
            placeholders: '?, ?, ?, ?',
            values: [doc.id, serializedData, doc.created_at!.toISOString(), doc.updated_at!.toISOString()]
        };
    }

    protected buildWhereClause(where: WhereClause = {}): { clause: string; params: any[] } {
        // Standard where clause building (no tenant filtering needed)
        // ... build WHERE clause without tenant_id
    }

    protected deserializeDocument(row: any): T {
        const data = JSON.parse(row.data);
        return {
            id: row.id,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            ...data
        } as T;
    }
}
```

#### System Model (No Tenant Context)

**File**: `backend/src/database/system-model.ts`

```typescript
export abstract class SystemModel<T extends BaseDocument> extends Model<T> {
    protected getDatabase() {
        return hybridManager.getSharedDatabase();
    }

    // Same implementation as IsolatedModel but without tenant context dependency
    // Used for system-level models like Tenant model itself
}
```

### 4. Model Implementations

#### Tenant Model (System-level)

**File**: `backend/src/models/tenant.ts`

```typescript
export interface TenantDocument extends BaseDocument {
    name: string;
    slug: string; // URL-friendly identifier
    status: 'active' | 'inactive' | 'suspended';
    plan: 'free' | 'pro' | 'enterprise';
    settings: {
        domain?: string;
        features: string[];
        limits: {
            users: number;
            storage: number; // in MB
            executions_per_month: number;
        };
    };
    billing?: {
        subscription_id?: string;
        current_period_end?: Date;
    };
}

export class TenantModel extends SystemModel<TenantDocument> {
    protected tableName = 'tenants';

    async findBySlug(slug: string): Promise<TenantDocument | null> {
        return this.findOne({ slug });
    }

    async findActive(): Promise<TenantDocument[]> {
        return this.findMany({ where: { status: 'active' } });
    }

    async createTenant(data: Omit<TenantDocument, 'id' | 'created_at' | 'updated_at'>): Promise<TenantDocument> {
        const tenant = await this.create(data);
        
        // Initialize tenant database
        await hybridManager.initializeTenantDatabase(tenant.id!);
        
        return tenant;
    }
}

export const tenantModel = new TenantModel();
```

#### User Model (Shared with tenant_id)

**File**: `backend/src/models/user.ts`

```typescript
export interface UserDocument extends SharedDocument {
    email: string;
    name: string;
    role: 'admin' | 'user' | 'viewer';
    status: 'active' | 'inactive' | 'pending';
    // ... other user fields
}

export class UserModel extends SharedModel<UserDocument> {
    protected tableName = 'users';

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.findOne({ email }); // Automatically tenant-scoped
    }

    async findByRole(role: UserDocument['role']): Promise<UserDocument[]> {
        return this.findMany({ where: { role } }); // Automatically tenant-scoped
    }
}

export const userModel = new UserModel();
```

#### Prompt Model (Isolated per tenant)

**File**: `backend/src/models/prompt.ts`

```typescript
export interface PromptDocument extends BaseDocument {
    title: string;
    content: string;
    version: number;
    // ... other prompt fields
}

export class PromptModel extends IsolatedModel<PromptDocument> {
    protected tableName = 'prompts';

    async findByTitle(title: string): Promise<PromptDocument | null> {
        return this.findOne({ title }); // Already tenant-isolated by database
    }
}

export const promptModel = new PromptModel();
```

### 5. Tenant Middleware

**File**: `backend/src/middleware/tenant-middleware.ts`

```typescript
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let tenantId: string | undefined;

        // Strategy 1: Subdomain (tenant1.hypersigil.com)
        const host = req.get('host');
        if (host) {
            const subdomain = host.split('.')[0];
            if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
                tenantId = subdomain;
            }
        }

        // Strategy 2: Header
        if (!tenantId) {
            tenantId = req.get('x-tenant-id');
        }

        // Strategy 3: Path prefix (/tenant/abc123/api/...)
        if (!tenantId) {
            const pathMatch = req.path.match(/^\/tenant\/([^\/]+)/);
            if (pathMatch) {
                tenantId = pathMatch[1];
            }
        }

        if (!tenantId) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Tenant identification required'
            });
        }

        // Validate tenant exists and is active
        const tenant = await tenantModel.findById(tenantId);
        if (!tenant || tenant.status !== 'active') {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Tenant not found or inactive'
            });
        }

        // Set tenant context for this request
        tenantContext.setContext(tenantId);
        req.tenantId = tenantId;

        next();
    } catch (error) {
        console.error('Tenant middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Tenant resolution failed'
        });
    }
};
```

### 6. Database Structure

#### File Organization
```
backend/data/
├── shared.sqlite          # Shared database (users, settings, tenants, api_keys)
├── tenant_abc123.sqlite   # Tenant-specific database (prompts, executions, files)
├── tenant_def456.sqlite   # Another tenant's database
└── tenant_xyz789.sqlite   # Yet another tenant's database
```

#### Model Strategy Configuration

| Model | Strategy | Reason |
|-------|----------|---------|
| `TenantModel` | System | Global tenant management |
| `UserModel` | Shared | Cross-tenant user management, admin queries |
| `ApiKeyModel` | Shared | Cross-tenant API access |
| `SettingsModel` | Shared | Tenant-scoped configuration |
| `PromptModel` | Isolated | Large content, complete isolation |
| `ExecutionModel` | Isolated | Large data, performance isolation |
| `FileModel` | Isolated | Large files, storage isolation |
| `DeploymentModel` | Isolated | Tenant-specific deployments |

### 7. Migration Strategy

#### Hybrid Migration Manager

**File**: `backend/src/database/hybrid-migrations.ts`

```typescript
export class HybridMigrationManager {
    async runMigrations(): Promise<void> {
        // Run migrations on shared database
        await this.runSharedMigrations();
        
        // Run migrations on all tenant databases
        const tenants = await tenantModel.findActive();
        for (const tenant of tenants) {
            await this.runTenantMigrations(tenant.id!);
        }
    }

    private async runSharedMigrations(): Promise<void> {
        // Migrate shared models (users, settings, api_keys, tenants)
        const sharedDb = hybridManager.getSharedDatabase();
        // ... run migrations on shared database
    }

    private async runTenantMigrations(tenantId: string): Promise<void> {
        // Migrate isolated models (prompts, executions, files)
        const tenantDb = hybridManager.getTenantDatabase(tenantId);
        // ... run migrations on tenant database
    }

    async createTenantDatabase(tenantId: string): Promise<void> {
        // Initialize new tenant database with current schema
        const tenantDb = hybridManager.getTenantDatabase(tenantId);
        await this.runTenantMigrations(tenantId);
    }
}
```

### 8. API Integration

#### Enhanced Authentication Middleware

```typescript
export const authMiddleware: EndpointMiddleware = async (req, res, next) => {
    // ... existing authentication logic

    // Ensure user belongs to current tenant (for shared models)
    if (req.tenantId && req.user) {
        const user = await userModel.findById(req.user.id);
        if (!user || user.tenant_id !== req.tenantId) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'User does not belong to this tenant'
            });
        }
    }

    next();
};
```

#### Tenant Management API

**File**: `backend/src/api/definitions/tenant.ts`

```typescript
export const TenantApiDefinition = {
    prefix: '/api/tenants',
    endpoints: {
        tenants: {
            create: {
                method: 'POST' as const,
                path: '/',
                requestSchema: {
                    body: z.object({
                        name: z.string().min(1).max(255),
                        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
                        plan: z.enum(['free', 'pro', 'enterprise']),
                        settings: z.object({
                            features: z.array(z.string()),
                            limits: z.object({
                                users: z.number().min(1),
                                storage: z.number().min(100),
                                executions_per_month: z.number().min(100)
                            })
                        })
                    })
                },
                responseSchema: tenantResponseSchema
            },
            getById: {
                method: 'GET' as const,
                path: '/:id',
                requestSchema: {
                    params: z.object({ id: z.string() })
                },
                responseSchema: tenantResponseSchema
            },
            update: {
                method: 'PUT' as const,
                path: '/:id',
                requestSchema: {
                    params: z.object({ id: z.string() }),
                    body: z.object({
                        name: z.string().min(1).max(255).optional(),
                        status: z.enum(['active', 'inactive', 'suspended']).optional(),
                        settings: z.object({
                            features: z.array(z.string()).optional(),
                            limits: z.object({
                                users: z.number().min(1).optional(),
                                storage: z.number().min(100).optional(),
                                executions_per_month: z.number().min(100).optional()
                            }).optional()
                        }).optional()
                    })
                },
                responseSchema: tenantResponseSchema
            }
        }
    }
};
```

### 9. Benefits of Hybrid Architecture

#### Complete Data Isolation
- **Database-level isolation** for sensitive data (prompts, executions, files)
- **No risk of cross-tenant data leaks** for isolated models
- **Independent scaling** per tenant for large data

#### Operational Efficiency
- **Shared infrastructure** for user management and settings
- **Cross-tenant admin queries** for shared models
- **Simplified backup/restore** per tenant for isolated data

#### Performance Optimization
- **Smaller databases** for isolated models improve query performance
- **Tenant-specific indexing** strategies
- **Independent database optimization** per tenant

#### Flexibility
- **Easy model migration** between strategies by changing base class
- **Granular isolation control** per model type
- **Future-proof architecture** for different tenant requirements

### 10. Implementation Plan

#### Phase 1: Core Infrastructure (2-3 weeks)
- Implement `HybridDatabaseManager` and connection management
- Create base model classes (`Model`, `SharedModel`, `IsolatedModel`, `SystemModel`)
- Implement tenant context management with `AsyncLocalStorage`
- Create `TenantModel` and basic tenant CRUD operations

#### Phase 2: Model Migration (2-3 weeks)
- Migrate existing models to appropriate base classes
- Update model configurations and table schemas
- Implement tenant middleware for request context
- Create hybrid migration system

#### Phase 3: API Integration (1-2 weeks)
- Update authentication middleware for tenant validation
- Implement tenant management API endpoints
- Add tenant identification strategies (subdomain, header, path)
- Update existing API endpoints for tenant context

#### Phase 4: Data Migration (1-2 weeks)
- Create migration scripts for existing data
- Implement tenant onboarding flow
- Add tenant database initialization
- Create data export/import utilities

#### Phase 5: Testing & Documentation (1 week)
- Comprehensive testing of isolation strategies
- Performance testing and optimization
- Update API documentation
- Create tenant management documentation

### 11. Security Considerations

#### Data Isolation
- **Complete database separation** for isolated models prevents cross-tenant access
- **Automatic tenant filtering** for shared models ensures data isolation
- **Tenant validation** in middleware prevents unauthorized access

#### Access Control
- **Tenant-scoped authentication** ensures users can only access their tenant's data
- **API key tenant validation** for programmatic access
- **Admin role separation** between system and tenant administrators

#### Audit & Compliance
- **Tenant-specific audit logs** for compliance requirements
- **Data residency control** through database file location
- **GDPR compliance** through tenant data isolation and deletion capabilities

### 12. Monitoring & Maintenance

#### Database Management
- **Automated backup** per tenant database
- **Database size monitoring** and alerts
- **Performance metrics** per tenant
- **Connection pool management** for tenant databases

#### Tenant Lifecycle
- **Tenant provisioning** automation
- **Database cleanup** for deleted tenants
- **Migration tracking** per tenant database
- **Health checks** for tenant databases

## Conclusion

This hybrid multi-tenant architecture provides the flexibility to choose the appropriate isolation strategy per model while maintaining a clean, maintainable codebase. The separation of concerns between `SharedModel`, `IsolatedModel`, and `SystemModel` makes the multi-tenant strategy explicit and easy to understand.

The architecture scales from simple shared-table multi-tenancy to complete database isolation, providing a future-proof foundation that can adapt to changing requirements and growth patterns.
