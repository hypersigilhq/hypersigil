import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { db } from '../database/manager';
import { AIProviderName, ExecutionOptions } from '../providers/base-provider';

// Execution interface extending BaseDocument
export interface Execution extends BaseDocument {
    prompt_id?: string | undefined;
    prompt_version?: number | undefined;
    prompt_text?: string | undefined;
    user_input: string;
    provider: AIProviderName;  // e.g., "ollama"
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
    fileId?: string | undefined;
    // whats the origin of the execution
    origin: 'app' | 'api';
    webhookDestinationIds?: string[] | undefined; // destined webhooks to deliver
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

    // Custom method to get pending executions for a specific provider
    public async getPendingExecutionsByProvider(provider: AIProviderName, limit: number = 10): Promise<Execution[]> {
        return this.findMany({
            where: { status: 'pending', provider },
            orderBy: 'created_at',
            orderDirection: 'ASC',
            limit
        });
    }

    // Custom method to get running executions for a specific provider
    public async getRunningExecutionsByProvider(provider: AIProviderName): Promise<Execution[]> {
        return this.findMany({
            where: { status: 'running', provider },
            orderBy: 'created_at',
            orderDirection: 'ASC'
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
        byProvider: Record<AIProviderName, number>;
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

    // Dashboard-related methods
    public async getDashboardStats(startDate?: string, endDate?: string): Promise<{
        totalTokensUsed: number;
        totalExecutions: number;
        activeProviders: number;
        activeModels: number;
        topProvider: { name: string; tokens: number; percentage: number } | undefined;
        topModel: { name: string; tokens: number; percentage: number } | undefined;
    }> {
        // Build date filter
        let dateFilter = '';
        if (startDate || endDate) {
            dateFilter = ' AND ';
            const conditions: string[] = [];
            if (startDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') >= '${startDate}'`);
            }
            if (endDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') <= '${endDate}'`);
            }
            dateFilter += conditions.join(' AND ');
        }

        // Get total executions count
        const totalExecutions = await this.count({
            status: 'completed'
        });

        // Get total tokens used
        const totalTokensResult = db.getDatabase().prepare(`
            SELECT
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0) +
                    COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as totalTokens
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'${dateFilter}
        `).get() as { totalTokens: number | null };

        const totalTokensUsed = totalTokensResult.totalTokens || 0;

        // Get active providers count
        const activeProvidersResult = db.getDatabase().prepare(`
            SELECT COUNT(DISTINCT JSON_EXTRACT(data, '$.provider')) as count
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'${dateFilter}
        `).get() as { count: number };

        // Get active models count
        const activeModelsResult = db.getDatabase().prepare(`
            SELECT COUNT(DISTINCT JSON_EXTRACT(data, '$.model')) as count
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'${dateFilter}
        `).get() as { count: number };

        // Get top provider
        const topProviderResult = db.getDatabase().prepare(`
            SELECT
                JSON_EXTRACT(data, '$.provider') as provider,
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0) +
                    COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as tokens
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'${dateFilter}
            GROUP BY JSON_EXTRACT(data, '$.provider')
            ORDER BY tokens DESC
            LIMIT 1
        `).get() as { provider: string; tokens: number } | undefined;

        // Get top model
        const topModelResult = db.getDatabase().prepare(`
            SELECT
                JSON_EXTRACT(data, '$.model') as model,
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0) +
                    COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as tokens
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'${dateFilter}
            GROUP BY JSON_EXTRACT(data, '$.model')
            ORDER BY tokens DESC
            LIMIT 1
        `).get() as { model: string; tokens: number } | undefined;

        return {
            totalTokensUsed,
            totalExecutions,
            activeProviders: activeProvidersResult.count,
            activeModels: activeModelsResult.count,
            topProvider: topProviderResult ? {
                name: topProviderResult.provider,
                tokens: topProviderResult.tokens,
                percentage: totalTokensUsed > 0 ? (topProviderResult.tokens / totalTokensUsed) * 100 : 0
            } : undefined,
            topModel: topModelResult ? {
                name: topModelResult.model,
                tokens: topModelResult.tokens,
                percentage: totalTokensUsed > 0 ? (topModelResult.tokens / totalTokensUsed) * 100 : 0
            } : undefined
        };
    }

    public async getTokenUsageByProviderModel(startDate?: string, endDate?: string): Promise<{
        provider: string;
        model: string;
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        executionCount: number;
    }[]> {
        // Build date filter
        let dateFilter = '';
        if (startDate || endDate) {
            dateFilter = ' AND ';
            const conditions: string[] = [];
            if (startDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') >= '${startDate}'`);
            }
            if (endDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') <= '${endDate}'`);
            }
            dateFilter += conditions.join(' AND ');
        }

        const sql = `
            SELECT
                JSON_EXTRACT(data, '$.provider') as provider,
                JSON_EXTRACT(data, '$.model') as model,
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0)) as inputTokens,
                SUM(COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as outputTokens,
                COUNT(*) as executionCount
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'${dateFilter}
            GROUP BY JSON_EXTRACT(data, '$.provider'), JSON_EXTRACT(data, '$.model')
            ORDER BY (inputTokens + outputTokens) DESC
        `;

        const rows = db.getDatabase().prepare(sql).all() as {
            provider: string;
            model: string;
            inputTokens: number;
            outputTokens: number;
            executionCount: number;
        }[];

        return rows.map(row => ({
            provider: row.provider,
            model: row.model,
            totalTokens: row.inputTokens + row.outputTokens,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            executionCount: row.executionCount
        }));
    }

    public async getDailyTokenUsage(days: number = 30, startDate?: string, endDate?: string): Promise<{
        date: string;
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        executionCount: number;
    }[]> {
        // Build date filter
        let dateFilter = '';
        if (startDate || endDate) {
            dateFilter = ' AND ';
            const conditions: string[] = [];
            if (startDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') >= '${startDate}'`);
            }
            if (endDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') <= '${endDate}'`);
            }
            dateFilter += conditions.join(' AND ');
        }

        const sql = `
            SELECT
                DATE(JSON_EXTRACT(data, '$.completed_at')) as date,
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0)) as inputTokens,
                SUM(COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as outputTokens,
                COUNT(*) as executionCount
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'
                AND JSON_EXTRACT(data, '$.completed_at') IS NOT NULL${dateFilter}
            GROUP BY DATE(JSON_EXTRACT(data, '$.completed_at'))
            ORDER BY date DESC
            LIMIT ?
        `;

        const rows = db.getDatabase().prepare(sql).all(days) as {
            date: string;
            inputTokens: number;
            outputTokens: number;
            executionCount: number;
        }[];

        return rows.map(row => ({
            date: row.date,
            totalTokens: row.inputTokens + row.outputTokens,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            executionCount: row.executionCount
        }));
    }

    public async getHourlyTokenUsage(hours: number = 24, startDate?: string, endDate?: string): Promise<{
        hour: number;
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        executionCount: number;
    }[]> {
        // Build date filter
        let dateFilter = '';
        if (startDate || endDate) {
            dateFilter = ' AND ';
            const conditions: string[] = [];
            if (startDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') >= '${startDate}'`);
            }
            if (endDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') <= '${endDate}'`);
            }
            dateFilter += conditions.join(' AND ');
        } else if (hours > 0) {
            // If no explicit dates provided, use hours parameter to filter to last N hours
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hours);
            dateFilter = ` AND JSON_EXTRACT(data, '$.completed_at') >= '${cutoffDate.toISOString()}'`;
        }

        const sql = `
            SELECT
                CAST(STRFTIME('%H', JSON_EXTRACT(data, '$.completed_at')) AS INTEGER) as hour,
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0)) as inputTokens,
                SUM(COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as outputTokens,
                COUNT(*) as executionCount
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'
                AND JSON_EXTRACT(data, '$.completed_at') IS NOT NULL${dateFilter}
            GROUP BY STRFTIME('%H', JSON_EXTRACT(data, '$.completed_at'))
            ORDER BY hour
        `;

        const rows = db.getDatabase().prepare(sql).all() as {
            hour: number;
            inputTokens: number;
            outputTokens: number;
            executionCount: number;
        }[];

        return rows.map(row => ({
            hour: row.hour,
            totalTokens: row.inputTokens + row.outputTokens,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            executionCount: row.executionCount
        }));
    }

    public async getDailyTokenUsageByProviderModel(days: number = 30, startDate?: string, endDate?: string): Promise<{
        date: string;
        provider: string;
        model: string;
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        executionCount: number;
    }[]> {
        // Build date filter
        let dateFilter = '';
        if (startDate || endDate) {
            dateFilter = ' AND ';
            const conditions: string[] = [];
            if (startDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') >= '${startDate}'`);
            }
            if (endDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') <= '${endDate}'`);
            }
            dateFilter += conditions.join(' AND ');
        }

        const sql = `
            SELECT
                DATE(JSON_EXTRACT(data, '$.completed_at')) as date,
                JSON_EXTRACT(data, '$.provider') as provider,
                JSON_EXTRACT(data, '$.model') as model,
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0)) as inputTokens,
                SUM(COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as outputTokens,
                COUNT(*) as executionCount
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'
                AND JSON_EXTRACT(data, '$.completed_at') IS NOT NULL${dateFilter}
            GROUP BY DATE(JSON_EXTRACT(data, '$.completed_at')), JSON_EXTRACT(data, '$.provider'), JSON_EXTRACT(data, '$.model')
            ORDER BY date DESC, provider, model
        `;

        const rows = db.getDatabase().prepare(sql).all() as {
            date: string;
            provider: string;
            model: string;
            inputTokens: number;
            outputTokens: number;
            executionCount: number;
        }[];

        return rows.map(row => ({
            date: row.date,
            provider: row.provider,
            model: row.model,
            totalTokens: row.inputTokens + row.outputTokens,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            executionCount: row.executionCount
        }));
    }

    public async getHourlyTokenUsageByProviderModel(hours: number = 24, startDate?: string, endDate?: string): Promise<{
        hour: number;
        provider: string;
        model: string;
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        executionCount: number;
    }[]> {
        // Build date filter
        let dateFilter = '';
        if (startDate || endDate) {
            dateFilter = ' AND ';
            const conditions: string[] = [];
            if (startDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') >= '${startDate}'`);
            }
            if (endDate) {
                conditions.push(`JSON_EXTRACT(data, '$.completed_at') <= '${endDate}'`);
            }
            dateFilter += conditions.join(' AND ');
        } else if (hours > 0) {
            // If no explicit dates provided, use hours parameter to filter to last N hours
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hours);
            dateFilter = ` AND JSON_EXTRACT(data, '$.completed_at') >= '${cutoffDate.toISOString()}'`;
        }

        const sql = `
            SELECT
                CAST(STRFTIME('%H', JSON_EXTRACT(data, '$.completed_at')) AS INTEGER) as hour,
                JSON_EXTRACT(data, '$.provider') as provider,
                JSON_EXTRACT(data, '$.model') as model,
                SUM(COALESCE(JSON_EXTRACT(data, '$.input_tokens_used'), 0)) as inputTokens,
                SUM(COALESCE(JSON_EXTRACT(data, '$.output_tokens_used'), 0)) as outputTokens,
                COUNT(*) as executionCount
            FROM ${this.tableName}
            WHERE JSON_EXTRACT(data, '$.status') = 'completed'
                AND JSON_EXTRACT(data, '$.completed_at') IS NOT NULL${dateFilter}
            GROUP BY STRFTIME('%H', JSON_EXTRACT(data, '$.completed_at')), JSON_EXTRACT(data, '$.provider'), JSON_EXTRACT(data, '$.model')
            ORDER BY hour, provider, model
        `;

        const rows = db.getDatabase().prepare(sql).all() as {
            hour: number;
            provider: string;
            model: string;
            inputTokens: number;
            outputTokens: number;
            executionCount: number;
        }[];

        return rows.map(row => ({
            hour: row.hour,
            provider: row.provider,
            model: row.model,
            totalTokens: row.inputTokens + row.outputTokens,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            executionCount: row.executionCount
        }));
    }
}

// Export a singleton instance
export const executionModel = new ExecutionModel();
