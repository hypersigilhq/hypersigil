import { WorkerContext, Logger } from './types';
import { jobModel } from './models/job';
import { Scheduler } from './scheduler';

/**
 * Simple logger implementation
 */
class JobLogger implements Logger {
    constructor(private jobId: string) { }

    info(message: string, meta?: any): void {
        console.log(`[Job ${this.jobId}] INFO: ${message}`, meta || '');
    }

    warn(message: string, meta?: any): void {
        console.warn(`[Job ${this.jobId}] WARN: ${message}`, meta || '');
    }

    error(message: string, meta?: any): void {
        console.error(`[Job ${this.jobId}] ERROR: ${message}`, meta || '');
    }

    debug(message: string, meta?: any): void {
        console.debug(`[Job ${this.jobId}] DEBUG: ${message}`, meta || '');
    }
}

/**
 * WorkerContext implementation with job control methods
 */
export class WorkerContextImpl implements WorkerContext {
    public readonly logger: Logger;

    constructor(
        public readonly jobId: string,
        public readonly attempt: number
    ) {
        this.logger = new JobLogger(jobId);
    }

    /**
     * Schedule the job for retry with optional delay
     */
    async scheduleRetry(delayMs?: number, reason?: string): Promise<void> {
        let actualDelayMs = delayMs;

        // If no delay is provided, calculate it based on job configuration
        if (actualDelayMs === undefined) {
            const job = await jobModel.findById(this.jobId);
            if (job) {
                actualDelayMs = Scheduler.calculateRetryDelay(job);
            } else {
                actualDelayMs = 5000; // Fallback default
            }
        }

        const nextRetryAt = new Date(Date.now() + actualDelayMs);

        const result = await jobModel.scheduleRetry(this.jobId, nextRetryAt, reason);

        if (!result.success) {
            throw new Error(`Failed to schedule retry: ${result.error}`);
        }

        this.logger.info(`Job scheduled for retry at ${nextRetryAt.toISOString()}`, {
            reason,
            delayMs: actualDelayMs,
            attempt: this.attempt + 1,
            calculatedDelay: delayMs === undefined
        });
    }

    /**
     * Terminate the job permanently
     */
    async terminate(reason: string): Promise<void> {
        const result = await jobModel.terminateJob(this.jobId, reason);

        if (!result.success) {
            throw new Error(`Failed to terminate job: ${result.error}`);
        }

        this.logger.warn(`Job terminated: ${reason}`);
    }

    /**
     * Reschedule the job for future execution
     */
    async reschedule(newScheduledAt: Date, reason?: string): Promise<void> {
        const result = await jobModel.rescheduleJob(this.jobId, newScheduledAt, reason);

        if (!result.success) {
            throw new Error(`Failed to reschedule job: ${result.error}`);
        }

        this.logger.info(`Job rescheduled for ${newScheduledAt.toISOString()}`, {
            reason,
            originalAttempt: this.attempt
        });
    }
}
