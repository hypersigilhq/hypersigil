import { randomUUID } from 'crypto';
import { jobModel } from './models/job';
import { WorkerTypeMap, ScheduleOptions, JobDocument } from './types';

class SchedulerImpl {
    private defaultMaxAttempts = 3;
    private defaultRetryDelayMs = 5000;
    private defaultRetryBackoffMultiplier = 1.5;
    private defaultMaxRetryDelayMs = 300000; // 5 minutes

    /**
     * Schedule a job with type safety
     */
    async send<K extends keyof WorkerTypeMap>(
        workType: K,
        data: WorkerTypeMap[K]['input'],
        options?: ScheduleOptions
    ): Promise<string> {
        const jobId = randomUUID();
        const now = new Date();

        const jobData: Omit<JobDocument, 'id' | 'created_at' | 'updated_at'> = {
            type: workType as string,
            data,
            status: 'pending',
            attempts: 0,
            maxAttempts: options?.maxAttempts || this.defaultMaxAttempts,
            scheduledAt: options?.scheduledAt || now,
            retryDelayMs: options?.retryDelayMs || this.defaultRetryDelayMs,
            retryBackoffMultiplier: options?.retryBackoffMultiplier || this.defaultRetryBackoffMultiplier,
            maxRetryDelayMs: options?.maxRetryDelayMs || this.defaultMaxRetryDelayMs
        };

        await jobModel.create(jobData);
        return jobId;
    }

    /**
     * Schedule a job for immediate execution
     */
    async sendNow<K extends keyof WorkerTypeMap>(
        workType: K,
        data: WorkerTypeMap[K]['input'],
        maxAttempts?: number
    ): Promise<string> {
        const options: ScheduleOptions = {
            scheduledAt: new Date()
        };

        if (maxAttempts !== undefined) {
            options.maxAttempts = maxAttempts;
        }

        return this.send(workType, data, options);
    }

    /**
     * Schedule a job for future execution
     */
    async sendLater<K extends keyof WorkerTypeMap>(
        workType: K,
        data: WorkerTypeMap[K]['input'],
        scheduledAt: Date,
        maxAttempts?: number
    ): Promise<string> {
        const options: ScheduleOptions = {
            scheduledAt
        };

        if (maxAttempts !== undefined) {
            options.maxAttempts = maxAttempts;
        }

        return this.send(workType, data, options);
    }

    /**
     * Schedule a job with delay in milliseconds
     */
    async sendDelayed<K extends keyof WorkerTypeMap>(
        workType: K,
        data: WorkerTypeMap[K]['input'],
        delayMs: number,
        maxAttempts?: number
    ): Promise<string> {
        const scheduledAt = new Date(Date.now() + delayMs);
        return this.sendLater(workType, data, scheduledAt, maxAttempts);
    }

    /**
     * Schedule a job with custom retry configuration
     */
    async sendWithRetryConfig<K extends keyof WorkerTypeMap>(
        workType: K,
        data: WorkerTypeMap[K]['input'],
        retryConfig: {
            maxAttempts?: number;
            retryDelayMs?: number;
            retryBackoffMultiplier?: number;
            maxRetryDelayMs?: number;
        }
    ): Promise<string> {
        const options: ScheduleOptions = {
            scheduledAt: new Date(),
            ...retryConfig
        };

        return this.send(workType, data, options);
    }

    /**
     * Get job status
     */
    async getJobStatus(jobId: string): Promise<JobDocument | null> {
        return jobModel.findById(jobId);
    }

    /**
     * Get job result
     */
    async getJobResult<T = any>(jobId: string): Promise<T | null> {
        return jobModel.getJobResult<T>(jobId);
    }

    /**
     * Cancel a pending job
     */
    async cancelJob(jobId: string, reason: string = 'Cancelled by user'): Promise<boolean> {
        const job = await jobModel.findById(jobId);
        if (!job) {
            return false;
        }

        if (job.status !== 'pending' && job.status !== 'retrying') {
            return false; // Can only cancel pending or retrying jobs
        }

        const result = await jobModel.terminateJob(jobId, reason);
        return result.success;
    }

    /**
     * Set default max attempts for new jobs
     */
    setDefaultMaxAttempts(maxAttempts: number): void {
        this.defaultMaxAttempts = maxAttempts;
    }

    /**
     * Get default max attempts
     */
    getDefaultMaxAttempts(): number {
        return this.defaultMaxAttempts;
    }

    /**
     * Set default retry delay for new jobs
     */
    setDefaultRetryDelayMs(delayMs: number): void {
        this.defaultRetryDelayMs = delayMs;
    }

    /**
     * Get default retry delay
     */
    getDefaultRetryDelayMs(): number {
        return this.defaultRetryDelayMs;
    }

    /**
     * Set default retry backoff multiplier for new jobs
     */
    setDefaultRetryBackoffMultiplier(multiplier: number): void {
        this.defaultRetryBackoffMultiplier = multiplier;
    }

    /**
     * Get default retry backoff multiplier
     */
    getDefaultRetryBackoffMultiplier(): number {
        return this.defaultRetryBackoffMultiplier;
    }

    /**
     * Set default maximum retry delay for new jobs
     */
    setDefaultMaxRetryDelayMs(maxDelayMs: number): void {
        this.defaultMaxRetryDelayMs = maxDelayMs;
    }

    /**
     * Get default maximum retry delay
     */
    getDefaultMaxRetryDelayMs(): number {
        return this.defaultMaxRetryDelayMs;
    }

    /**
     * Calculate the next retry delay based on job configuration and attempt number
     */
    calculateRetryDelay(job: JobDocument): number {
        const baseDelay = job.retryDelayMs || this.defaultRetryDelayMs;
        const backoffMultiplier = job.retryBackoffMultiplier || this.defaultRetryBackoffMultiplier;
        const maxDelay = job.maxRetryDelayMs || this.defaultMaxRetryDelayMs;

        // Calculate exponential backoff delay
        const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, job.attempts);

        // Cap at maximum delay
        return Math.min(exponentialDelay, maxDelay);
    }
}

// Export singleton instance
export const Scheduler = new SchedulerImpl();
