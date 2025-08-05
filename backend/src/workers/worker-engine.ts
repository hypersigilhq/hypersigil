import { jobModel } from './models/job';
import { WorkerRegistry } from './worker-registry';
import { WorkerContextImpl } from './worker-context';
import { WorkerEngineConfig, JobDocument } from './types';

/**
 * Worker engine that processes jobs from the queue
 */
export class WorkerEngine {
    private isRunning = false;
    private runningJobs = new Set<string>();
    private config: WorkerEngineConfig;
    private pollTimer?: NodeJS.Timeout | undefined;

    constructor(config?: Partial<WorkerEngineConfig>) {
        this.config = {
            maxConcurrency: config?.maxConcurrency || 5,
            pollIntervalMs: config?.pollIntervalMs || 1000,
            defaultMaxAttempts: config?.defaultMaxAttempts || 3,
            enableRetries: config?.enableRetries ?? true
        };
    }

    /**
     * Start the worker engine
     */
    start(): void {
        if (this.isRunning) {
            console.warn('Worker engine is already running');
            return;
        }

        this.isRunning = true;
        console.log('Starting worker engine with config:', this.config);
        this.scheduleNextPoll();
    }

    /**
     * Stop the worker engine
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('Stopping worker engine...');
        this.isRunning = false;

        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = undefined;
        }

        // Wait for running jobs to complete
        while (this.runningJobs.size > 0) {
            console.log(`Waiting for ${this.runningJobs.size} jobs to complete...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('Worker engine stopped');
    }

    /**
     * Get engine status
     */
    getStatus(): {
        isRunning: boolean;
        runningJobs: number;
        maxConcurrency: number;
        config: WorkerEngineConfig;
    } {
        return {
            isRunning: this.isRunning,
            runningJobs: this.runningJobs.size,
            maxConcurrency: this.config.maxConcurrency,
            config: this.config
        };
    }

    /**
     * Update engine configuration
     */
    updateConfig(newConfig: Partial<WorkerEngineConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('Worker engine config updated:', this.config);
    }

    /**
     * Schedule the next poll cycle
     */
    private scheduleNextPoll(): void {
        if (!this.isRunning) {
            return;
        }

        this.pollTimer = setTimeout(() => {
            this.pollForJobs().catch(error => {
                console.error('Error polling for jobs:', error);
            }).finally(() => {
                this.scheduleNextPoll();
            });
        }, this.config.pollIntervalMs);
    }

    /**
     * Poll for jobs and process them
     */
    private async pollForJobs(): Promise<void> {
        if (this.runningJobs.size >= this.config.maxConcurrency) {
            return; // At max concurrency
        }

        try {
            const job = await jobModel.getNextPendingJob();
            if (!job) {
                return; // No jobs available
            }

            // Check if job is scheduled for future execution
            if (job.scheduledAt > new Date()) {
                return; // Job not ready yet
            }

            // Process the job
            this.processJob(job).catch(error => {
                console.error(`Error processing job ${job.id}:`, error);
            });

        } catch (error) {
            console.error('Error polling for jobs:', error);
        }
    }

    /**
     * Process a single job
     */
    private async processJob(job: JobDocument): Promise<void> {
        const jobId = job.id;
        if (!jobId) {
            console.error('Job has no ID, skipping');
            return;
        }

        this.runningJobs.add(jobId);

        try {
            // Get the worker function
            const workerFunction = WorkerRegistry.get(job.type);
            if (!workerFunction) {
                const failResult = await jobModel.markAsFailed(jobId, `No worker registered for type: ${job.type}`);
                if (!failResult.success) {
                    console.error(`Failed to mark job as failed: ${failResult.error}`);
                }
                return;
            }

            // Mark job as running
            const markRunningResult = await jobModel.markAsRunning(jobId);
            if (!markRunningResult.success) {
                console.error(`Failed to mark job ${jobId} as running:`, markRunningResult.error);
                return;
            }

            // Create worker context
            const context = new WorkerContextImpl(
                jobId,
                job.attempts
            );

            context.logger.info(`Starting job execution`, {
                type: job.type,
                attempt: job.attempts + 1,
                maxAttempts: job.maxAttempts
            });

            // Execute the worker
            const result = await workerFunction(job.data, context);

            // If worker returns a result, mark as completed
            if (result !== undefined) {
                const completeResult = await jobModel.markAsCompleted(jobId, result);
                if (completeResult.success) {
                    context.logger.info('Job completed successfully');
                } else {
                    console.error(`Failed to mark job as completed: ${completeResult.error}`);
                }
            }
            // If result is undefined, worker used control methods (retry/terminate/reschedule)

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Job ${jobId} failed:`, error);

            // Check if we should retry
            if (this.config.enableRetries && job.attempts < job.maxAttempts - 1) {
                // Schedule retry with exponential backoff
                const delayMs = Math.min(
                    Math.pow(2, job.attempts) * 1000, // Exponential backoff
                    300000 // Max 5 minutes
                );
                const nextRetryAt = new Date(Date.now() + delayMs);

                const retryResult = await jobModel.scheduleRetry(
                    jobId,
                    nextRetryAt,
                    `Attempt ${job.attempts + 1} failed: ${errorMessage}`
                );

                if (retryResult.success) {
                    console.log(`Job ${jobId} scheduled for retry in ${delayMs}ms`);
                } else {
                    console.error(`Failed to schedule retry: ${retryResult.error}`);
                }

            } else {
                // Max attempts reached, mark as failed
                const failResult = await jobModel.markAsFailed(jobId, errorMessage);
                if (failResult.success) {
                    console.log(`Job ${jobId} failed permanently after ${job.attempts + 1} attempts`);
                } else {
                    console.error(`Failed to mark job as failed: ${failResult.error}`);
                }
            }
        } finally {
            this.runningJobs.delete(jobId);
        }
    }

    /**
     * Process a specific job by ID (for testing/debugging)
     */
    async processJobById(jobId: string, force?: boolean): Promise<void> {
        const job = await jobModel.findById(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        if (!force && job.status !== 'pending' && job.status !== 'retrying') {
            throw new Error(`Job ${jobId} is not in a processable state: ${job.status}`);
        }

        await this.processJob(job);
    }

    /**
     * Get statistics about job processing
     */
    async getStats(): Promise<{
        pending: number;
        running: number;
        completed: number;
        failed: number;
        retrying: number;
        terminated: number;
    }> {
        const [pending, running, completed, failed, retrying, terminated] = await Promise.all([
            jobModel.count({ status: 'pending' }),
            jobModel.count({ status: 'running' }),
            jobModel.count({ status: 'completed' }),
            jobModel.count({ status: 'failed' }),
            jobModel.count({ status: 'retrying' }),
            jobModel.count({ status: 'terminated' })
        ]);

        return {
            pending,
            running,
            completed,
            failed,
            retrying,
            terminated
        };
    }
}

// Export singleton instance
export const workerEngine = new WorkerEngine();
