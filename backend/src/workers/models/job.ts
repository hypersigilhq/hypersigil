import { Model } from '../../database/base-model';
import { JobDocument, JobStatus } from '../types';

export class JobModel extends Model<JobDocument> {
    protected tableName = 'worker_jobs';

    constructor() {
        super();
        this.ensureRegistered([
            { columnName: "status", jsonPath: "$.status", dataType: "TEXT", indexed: true },
        ]);
    }

    /**
     * Get the next pending job that's ready to be processed
     */
    async getNextPendingJob(): Promise<JobDocument | null> {
        const now = new Date();

        // Find jobs that are pending or ready for retry
        const job = await this.findOne({
            status: 'pending'
        });

        if (job) {
            return job;
        }

        // Check for retry jobs that are ready
        const sql = `
            SELECT * FROM ${this.tableName} 
            WHERE JSON_EXTRACT(data, '$.status') = 'retrying' 
            AND (JSON_EXTRACT(data, '$.nextRetryAt') IS NULL OR JSON_EXTRACT(data, '$.nextRetryAt') <= ?)
            ORDER BY created_at ASC 
            LIMIT 1
        `;

        try {
            const stmt = this.getDatabase().prepare(sql);
            const row = stmt.get(now.toISOString());
            return row ? this.deserializeDocument(row) : null;
        } catch (error) {
            console.error('Error getting next retry job:', error);
            return null;
        }
    }

    /**
     * Mark a job as running
     */
    async markAsRunning(jobId: string): Promise<Result<JobDocument, string>> {
        const updated = await this.update(jobId, {
            status: 'running',
            startedAt: new Date()
        });

        if (!updated) {
            return Err('Job not found or could not be updated');
        }

        return Ok(updated);
    }

    /**
     * Mark a job as completed with result
     */
    async markAsCompleted(jobId: string, result: any): Promise<Result<JobDocument, string>> {
        const updated = await this.update(jobId, {
            status: 'completed',
            result,
            completedAt: new Date()
        });

        if (!updated) {
            return Err('Job not found or could not be updated');
        }

        return Ok(updated);
    }

    /**
     * Mark a job as failed
     */
    async markAsFailed(jobId: string, error: string): Promise<Result<JobDocument, string>> {
        const updated = await this.update(jobId, {
            status: 'failed',
            error,
            completedAt: new Date()
        });

        if (!updated) {
            return Err('Job not found or could not be updated');
        }

        return Ok(updated);
    }

    /**
     * Schedule a job for retry
     */
    async scheduleRetry(jobId: string, nextRetryAt: Date, reason?: string): Promise<Result<JobDocument, string>> {
        const job = await this.findById(jobId);
        if (!job) {
            return Err('Job not found');
        }

        const updateData: any = {
            status: 'retrying',
            nextRetryAt,
            attempts: job.attempts + 1
        };

        if (reason) {
            updateData.error = reason;
        }

        const updated = await this.update(jobId, updateData);

        if (!updated) {
            return Err('Job could not be updated');
        }

        return Ok(updated);
    }

    /**
     * Terminate a job
     */
    async terminateJob(jobId: string, reason: string): Promise<Result<JobDocument, string>> {
        const updated = await this.update(jobId, {
            status: 'terminated',
            terminationReason: reason,
            completedAt: new Date()
        });

        if (!updated) {
            return Err('Job not found or could not be updated');
        }

        return Ok(updated);
    }

    /**
     * Reschedule a job for future execution
     */
    async rescheduleJob(jobId: string, newScheduledAt: Date, reason?: string): Promise<Result<JobDocument, string>> {
        const updateData: any = {
            status: 'pending',
            scheduledAt: newScheduledAt
        };

        if (reason) {
            updateData.error = reason;
        }

        const updated = await this.update(jobId, updateData);

        if (!updated) {
            return Err('Job not found or could not be updated');
        }

        return Ok(updated);
    }

    /**
     * Get job result if completed
     */
    async getJobResult<T = any>(jobId: string): Promise<T | null> {
        const job = await this.findById(jobId);
        return job?.status === 'completed' ? job.result : null;
    }

    /**
     * Get jobs by status
     */
    async getJobsByStatus(status: JobStatus, limit?: number): Promise<JobDocument[]> {
        const findOptions: any = {
            where: { status },
            orderBy: 'created_at',
            orderDirection: 'ASC'
        };

        if (limit) {
            findOptions.limit = limit;
        }

        return this.findMany(findOptions);
    }

    /**
     * Clean up old completed/failed jobs
     */
    async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const sql = `
            DELETE FROM ${this.tableName} 
            WHERE (JSON_EXTRACT(data, '$.status') IN ('completed', 'failed', 'terminated'))
            AND created_at < ?
        `;

        try {
            const stmt = this.getDatabase().prepare(sql);
            const result = stmt.run(cutoffDate.toISOString());
            return result.changes;
        } catch (error) {
            console.error('Error cleaning up old jobs:', error);
            return 0;
        }
    }

    private getDatabase() {
        // Use the global database from base model
        return (this as any).db || require('../../database/manager').db.getDatabase();
    }
}

// Export singleton instance
export const jobModel = new JobModel();
