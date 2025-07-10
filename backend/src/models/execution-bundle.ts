import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';

// ExecutionBundle interface extending BaseDocument
export interface ExecutionBundle extends BaseDocument {
    test_group_id: string;
    prompt_id: string;
    execution_ids: string[];
}

export class ExecutionBundleModel extends Model<ExecutionBundle> {
    protected tableName = 'execution_bundles';
}

// Export a singleton instance
export const executionBundleModel = new ExecutionBundleModel();
