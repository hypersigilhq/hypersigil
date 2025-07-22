import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';
import { ExecutionOptions } from '../providers/base-provider';

// Execution interface extending BaseDocument
export interface Execution extends BaseDocument {
    prompt_id?: string | undefined;
    prompt_version?: number | undefined;
    prompt_text?: string | undefined;
    user_input: string;
    provider: string;  // e.g., "ollama"
    model: string;     // e.g., "qwen2.5:6b"
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    result_valid?: boolean;
    result_validation_message?: string;
    input_tokens_used?: number;
    output_tokens_used?: number;
    error_message?: string;
    started_at?: Date;
    completed_at?: Date;
    options?: ExecutionOptions | undefined;
    starred?: boolean;
    user_status?: string;

    test_data_group_id?: string | undefined;
    test_data_item_id?: string | undefined;
    // used to correlate executions together
    trace_id?: string | undefined;
    // whats the origin of the execution
    origin: 'app' | 'api';
}

export class ExecutionModel extends Model<Execution> {
    protected tableName = 'executions';

    // Custom method to find executions by prompt ID
    public async findByPromptId(promptId: string): Promise<Execution[]> {
        return this.findMany({
            where: { prompt_id: promptId },
            orderBy: 'created_at',
            orderDirection: 'DESC'
        });
    }

    // Custom method to find executions by status
    public async findByStatus(status: Execution['status']): Promise<Execution[]> {
        return this.findMany({
            where: { status },
            orderBy: 'created_at',
            orderDirection: 'ASC'
        });
    }

    // Custom method to get pending executions for processing
    public async getPendingExecutions(limit: number = 10): Promise<Execution[]> {
        return this.findMany({
            where: { status: 'pending' },
            orderBy: 'created_at',
            orderDirection: 'ASC',
            limit
        });
    }

    // Custom method to update execution status
    public async updateStatus(
        id: string,
        status: Execution['status'],
        additionalData?: Partial<Pick<Execution, 'result' | 'input_tokens_used' | 'output_tokens_used' | 'error_message' | 'started_at' | 'completed_at'>>
    ): Promise<Execution | null> {
        const updateData: Partial<Execution> = { status };

        if (status === 'running' && !additionalData?.started_at) {
            updateData.started_at = new Date();
        }

        if ((status === 'completed' || status === 'failed') && !additionalData?.completed_at) {
            updateData.completed_at = new Date();
        }

        if (additionalData) {
            Object.assign(updateData, additionalData);
        }

        return this.update(id, updateData);
    }

    // Method to get executions with pagination and filtering
    public async findWithFilters(options: {
        page: number;
        limit: number;
        status?: Execution['status'];
        provider?: string;
        promptId?: string;
        starred?: boolean;
        ids?: string[];
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
    }): Promise<{
        data: Execution[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }> {
        const { page, limit, status, provider, promptId, orderBy = 'created_at', orderDirection = 'DESC', ids, starred } = options;
        // Build where clause
        const where: any = {};
        if (status) where.status = status;
        if (provider) where.provider = provider;
        if (promptId) where.prompt_id = promptId;
        if (starred !== undefined) where.starred = starred
        if (ids) where.id = ids;

        return this.findWithPagination({
            page,
            limit,
            where: Object.keys(where).length > 0 ? where : undefined,
            orderBy,
            orderDirection
        });
    }

    // Method to get execution statistics
    public async getStats(): Promise<{
        total: number;
        pending: number;
        running: number;
        completed: number;
        failed: number;
        byProvider: Record<string, number>;
    }> {
        const total = await this.count();
        const pending = await this.count({ status: 'pending' });
        const running = await this.count({ status: 'running' });
        const completed = await this.count({ status: 'completed' });
        const failed = await this.count({ status: 'failed' });

        // Get provider statistics
        const sql = `SELECT JSON_EXTRACT(data, '$.provider') as provider, COUNT(*) as count 
                     FROM ${this.tableName} 
                     GROUP BY JSON_EXTRACT(data, '$.provider')`;

        const stmt = db.getDatabase().prepare(sql);
        const providerRows = stmt.all() as { provider: string; count: number }[];

        const byProvider: Record<string, number> = {};
        providerRows.forEach(row => {
            byProvider[row.provider] = row.count;
        });

        return {
            total,
            pending,
            running,
            completed,
            failed,
            byProvider
        };
    }

    // Method to cleanup old completed executions
    public async cleanupOldExecutions(olderThanDays: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const sql = `DELETE FROM ${this.tableName} WHERE 
                     JSON_EXTRACT(data, '$.status') IN ('completed', 'failed') AND 
                     JSON_EXTRACT(data, '$.completed_at') < ?`;

        const stmt = db.getDatabase().prepare(sql);
        const result = stmt.run(cutoffDate.toISOString());

        return result.changes;
    }

    // Method to update user-specific properties (starred, user_status)
    public async updateUserProperties(id: string, updates: { starred?: boolean | undefined, userStatus?: string | undefined }): Promise<Execution | null> {
        return this.updateJsonProperties(id, updates);
    }
}

// Export a singleton instance
export const executionModel = new ExecutionModel();
