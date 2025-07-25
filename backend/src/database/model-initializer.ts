// Import all model instances to trigger their instantiation
import { promptModel } from '../models/prompt';
import { executionModel } from '../models/execution';
import { executionBundleModel } from '../models/execution-bundle';
import { testDataGroupModel } from '../models/test-data-group';
import { testDataItemModel } from '../models/test-data-item';
import { userModel } from '../models/user';
import { apiKeyModel } from '../models/api-key';
import { commentModel } from '../models/comment';
import { modelRegistry } from './model-registry';
import { settingsModel } from '../models';

/**
 * Explicitly register all models with the registry
 * This ensures all models are registered immediately during server startup
 */
export async function initializeAllModels(): Promise<void> {
    console.log('🔄 Registering all models explicitly...');

    // Force registration of all models by calling ensureRegistered on each
    const models = [
        promptModel,
        executionModel,
        executionBundleModel,
        testDataGroupModel,
        testDataItemModel,
        userModel,
        apiKeyModel,
        commentModel,
        settingsModel
    ];

    // Register each model explicitly
    for (const model of models) {
        model.ensureRegistered();
    }

    console.log(`📝 Registered ${models.length} models explicitly`);

    // Now initialize all tables
    await modelRegistry.initializeAllTables();
}
