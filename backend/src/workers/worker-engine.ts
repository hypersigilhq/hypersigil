import { jobModel } from './models/job';
import { WorkerRegistry } from './worker-registry';
import { WorkerContextImpl } from './worker-context';
import { WorkerEngineConfig, JobDocument, JobTypeConcurrencyConfig } from './types';

/**
 * Worker engine that processes jobs from the queue with per-job-type concurrency control
 */
export class WorkerEngine {
    private isRunning = false;
    private runningJobsByType = new Map<string, Set<string>>();
    private config: WorkerEngineConfig;
    private pollTimer?: NodeJS.Timeout | undefined;

    constructor(config?: Partial<WorkerEngineConfig>) {
        this.config = {
            defaultMaxConcurrency: config?.defaultMaxConcurrency || 5,
            jobTypeConcurrency: config?.jobTypeConcurrency || {},
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
        const totalRunningJobs = this.getTotalRunningJobs();
        while (totalRunningJobs > 0) {
            console.log(`Waiting for ${totalRunningJobs} jobs to complete...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('Worker engine stopped');
    }

    /**
     * Get total number of running jobs across all types
     */
    private getTotalRunningJobs(): number {
        let total = 0;
        for (const jobSet of this.runningJobsByType.values()) {
            total += jobSet.size;
        }
        return total;
    }

    /**
     * Get running jobs count for a specific job type
     */
    private getRunningJobsForType(jobType: string): number {
        return this.runningJobsByType.get(jobType)?.size || 0;
    }

    /**
     * Get max concurrency for a specific job type
     */
    private getMaxConcurrencyForType(jobType: string): number {
        const typeConfig = this.config.jobTypeConcurrency[jobType as keyof typeof this.config.jobTypeConcurrency];
        return typeConfig?.maxConcurrency || this.config.defaultMaxConcurrency;
    }

    /**
     * Get priority for a specific job type (lower number = higher priority)
     */
    private getPriorityForType(jobType: string): number {
        const typeConfig = this.config.jobTypeConcurrency[jobType as keyof typeof this.config.jobTypeConcurrency];
        return typeConfig?.priority || 999; // Default to low priority
    }

    /**
     * Check if a job type has available capacity
     */
    private hasCapacityForType(jobType: string): boolean {
        const running = this.getRunningJobsForType(jobType);
        const maxConcurrency = this.getMaxConcurrencyForType(jobType);
        return running < maxConcurrency;
    }

    /**
     * Add job to running jobs tracking
     */
    private addRunningJob(jobId: string, jobType: string): void {
        if (!this.runningJobsByType.has(jobType)) {
            this.runningJobsByType.set(jobType, new Set());
        }
        this.runningJobsByType.get(jobType)!.add(jobId);
    }

    /**
     * Remove job from running jobs tracking
     */
    private removeRunningJob(jobId: string, jobType: string): void {
        const jobSet = this.runningJobsByType.get(jobType);
        if (jobSet) {
            jobSet.delete(jobId);
            if (jobSet.size === 0) {
                this.runningJobsByType.delete(jobType);
            }
        }
    }

    /**
     * Get engine status with per-job-type breakdown
     */
    getStatus(): {
        isRunning: boolean;
        runningJobs: number;
        runningJobsByType: Record<string, number>;
        config: WorkerEngineConfig;
    } {
        const runningJobsByType: Record<string, number> = {};
        for (const [jobType, jobSet] of this.runningJobsByType.entries()) {
            runningJobsByType[jobType] = jobSet.size;
        }

        return {
            isRunning: this.isRunning,
            runningJobs: this.getTotalRunningJobs(),
            runningJobsByType,
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
     * Poll for jobs and process them with per-job-type concurrency control
     */
    private async pollForJobs(): Promise<void> {
        try {
            // Get all available job types sorted by priority
            const availableJobTypes = await this.getAvailableJobTypes();
            if (availableJobTypes.length === 0) {
                return; // No capacity available for any job type
            }

            // Try to get a job for each available job type (in priority order)
            for (const jobType of availableJobTypes) {
                const job = await jobModel.getNextPendingJobByType(jobType);
                if (!job) {
                    continue; // No jobs of this type available
                }

                // Check if job is scheduled for future execution
                if (job.scheduledAt > new Date()) {
                    continue; // Job not ready yet
                }

                // Process the job
                this.processJob(job).catch(error => {
                    console.error(`Error processing job ${job.id}:`, error);
                });

                // Only process one job per poll cycle to maintain fairness
                break;
            }

        } catch (error) {
            console.error('Error polling for jobs:', error);
        }
    }

    /**
     * Get job types that have available capacity, sorted by priority
     */
    private async getAvailableJobTypes(): Promise<string[]> {
        // Get all registered job types
        const allJobTypes = WorkerRegistry.getTypes();

        // Filter to only those with available capacity
        const availableTypes = allJobTypes.filter(jobType => this.hasCapacityForType(jobType));

        // Sort by priority (lower number = higher priority)
        availableTypes.sort((a, b) => this.getPriorityForType(a) - this.getPriorityForType(b));

        return availableTypes;
    }

    /**
     * Process a single job with per-job-type tracking
     */
    private async processJob(job: JobDocument): Promise<void> {
        const jobId = job.id;
        if (!jobId) {
            console.error('Job has no ID, skipping');
            return;
        }

        // Check if job type has capacity before processing
        if (!this.hasCapacityForType(job.type)) {
            console.warn(`No capacity available for job type ${job.type}, skipping job ${jobId}`);
            return;
        }

        // Add to running jobs tracking
        this.addRunningJob(jobId, job.type);

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
                maxAttempts: job.maxAttempts,
                runningJobsOfType: this.getRunningJobsForType(job.type),
                maxConcurrencyForType: this.getMaxConcurrencyForType(job.type)
            });

            // Execute the worker
            const result = await workerFunction(job.data, context);

            // No error was raised so mark the job as completed and save the result if returned any
            const completeResult = await jobModel.markAsCompleted(jobId, result);
            if (completeResult.success) {
                context.logger.info('Job completed successfully');
            } else {
                console.error(`Failed to mark job as completed: ${completeResult.error}`);
            }

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
            // Remove from running jobs tracking
            this.removeRunningJob(jobId, job.type);
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

// Export singleton instance with optimized configuration for webhook delivery
export const workerEngine = new WorkerEngine({
    defaultMaxConcurrency: 3,
    jobTypeConcurrency: {
        'webhook-delivery': {
            maxConcurrency: 10,
            priority: 1 // Highest priority - process webhooks first
        },
        'generate-embedding': {
            maxConcurrency: 5,
            priority: 2 // High priority - process embeddings quickly
        }
    },
    pollIntervalMs: 1000,
    defaultMaxAttempts: 3,
    enableRetries: true
});
