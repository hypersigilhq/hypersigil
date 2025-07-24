import { db } from './manager';

interface ModelRegistration {
    tableName: string;
    initialized: boolean;
}

export class ModelRegistry {
    private static instance: ModelRegistry;
    private models: Map<string, ModelRegistration> = new Map();

    private constructor() { }

    public static getInstance(): ModelRegistry {
        if (!ModelRegistry.instance) {
            ModelRegistry.instance = new ModelRegistry();
        }
        return ModelRegistry.instance;
    }

    /**
     * Register a model with its table name
     */
    public registerModel(modelName: string, tableName: string): void {
        if (this.models.has(modelName)) {
            console.warn(`⚠️  Model '${modelName}' is already registered`);
            return;
        }

        this.models.set(modelName, {
            tableName,
            initialized: false
        });

        console.log(`📝 Registered model '${modelName}' with table '${tableName}'`);
    }

    /**
     * Initialize all registered models by ensuring their tables exist
     */
    public async initializeAllTables(): Promise<void> {
        console.log('🔄 Initializing all model tables...');

        const initPromises: Promise<void>[] = [];

        for (const [modelName, registration] of this.models.entries()) {
            if (!registration.initialized) {
                initPromises.push(this.initializeModelTable(modelName, registration));
            }
        }

        await Promise.all(initPromises);
        console.log('✅ All model tables initialized successfully');
    }

    /**
     * Initialize a specific model's table
     */
    private async initializeModelTable(modelName: string, registration: ModelRegistration): Promise<void> {
        try {
            db.ensureTable(registration.tableName);
            registration.initialized = true;
            console.log(`✅ Table '${registration.tableName}' initialized for model '${modelName}'`);
        } catch (error) {
            console.error(`❌ Failed to initialize table '${registration.tableName}' for model '${modelName}':`, error);
            throw error;
        }
    }

    /**
     * Check if all models are initialized
     */
    public areAllTablesInitialized(): boolean {
        return Array.from(this.models.values()).every(registration => registration.initialized);
    }

    /**
     * Get initialization status for debugging
     */
    public getInitializationStatus(): Record<string, { tableName: string; initialized: boolean }> {
        const status: Record<string, { tableName: string; initialized: boolean }> = {};

        for (const [modelName, registration] of this.models.entries()) {
            status[modelName] = {
                tableName: registration.tableName,
                initialized: registration.initialized
            };
        }

        return status;
    }

    /**
     * Reset registry (useful for testing)
     */
    public reset(): void {
        this.models.clear();
    }
}

export const modelRegistry = ModelRegistry.getInstance();
