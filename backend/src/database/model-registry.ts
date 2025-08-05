import { db } from './manager';
import { VirtualColumnDefinition } from './base-model';

interface ModelRegistration {
    tableName: string;
    initialized: boolean;
    virtualColumns?: VirtualColumnDefinition[];
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
     * Register a model with its table name and optional virtual columns
     */
    public registerModel(modelName: string, tableName: string, virtualColumns?: VirtualColumnDefinition[]): void {
        if (this.models.has(modelName)) {
            console.warn(`⚠️  Model '${modelName}' is already registered`);
            return;
        }

        this.models.set(modelName, {
            tableName,
            initialized: false,
            ...(virtualColumns && { virtualColumns })
        });

        console.log(`📝 Registered model '${modelName}' with table '${tableName}'${virtualColumns ? ` and ${virtualColumns.length} virtual columns` : ''}`);
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
     * Initialize a specific model's table and virtual columns
     */
    private async initializeModelTable(modelName: string, registration: ModelRegistration): Promise<void> {
        try {
            // First ensure the table exists
            db.ensureTable(registration.tableName);

            // Create virtual columns if defined
            if (registration.virtualColumns && registration.virtualColumns.length > 0) {
                console.log(`🔧 Creating ${registration.virtualColumns.length} virtual columns for table '${registration.tableName}'...`);

                for (const virtualColumn of registration.virtualColumns) {
                    try {
                        // Create the virtual column
                        db.createVirtualColumn(
                            registration.tableName,
                            virtualColumn.columnName,
                            virtualColumn.jsonPath,
                            virtualColumn.dataType
                        );

                        // Create index if requested
                        if (virtualColumn.indexed) {
                            db.createVirtualColumnIndex(
                                registration.tableName,
                                virtualColumn.columnName,
                                virtualColumn.indexName
                            );
                        }
                    } catch (error) {
                        console.error(`❌ Failed to create virtual column '${virtualColumn.columnName}' for table '${registration.tableName}':`, error);
                        // Continue with other virtual columns even if one fails
                    }
                }
            }

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
     * Register a model with virtual columns (convenience method for models to self-register)
     */
    public registerModelWithVirtualColumns(modelName: string, tableName: string, virtualColumns: VirtualColumnDefinition[]): void {
        this.registerModel(modelName, tableName, virtualColumns);
    }

    /**
     * Get virtual columns for a registered model
     */
    public getModelVirtualColumns(modelName: string): VirtualColumnDefinition[] | undefined {
        const registration = this.models.get(modelName);
        return registration?.virtualColumns;
    }

    /**
     * Check if a model has virtual columns defined
     */
    public hasVirtualColumns(modelName: string): boolean {
        const registration = this.models.get(modelName);
        return !!(registration?.virtualColumns && registration.virtualColumns.length > 0);
    }

    /**
     * Reset registry (useful for testing)
     */
    public reset(): void {
        this.models.clear();
    }
}

export const modelRegistry = ModelRegistry.getInstance();
