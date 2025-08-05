import { BaseDocument } from '../database/types';
import { WebhookDeliveryData } from './workers/webhook-delivery';

// Job statuses
export type JobStatus =
    | 'pending'     // Waiting to be processed
    | 'running'     // Currently being processed
    | 'completed'   // Successfully completed
    | 'failed'      // Permanently failed (terminated)
    | 'retrying'    // Scheduled for retry
    | 'terminated'; // Manually terminated

// Job document interface
export interface JobDocument extends BaseDocument {
    type: string;
    data: any;
    status: JobStatus;
    result?: any;
    error?: string;
    terminationReason?: string;
    attempts: number;
    maxAttempts: number;
    scheduledAt: Date;
    nextRetryAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    retryDelayMs?: number;           // Fixed delay between retries
    retryBackoffMultiplier?: number; // Multiplier for exponential backoff
    maxRetryDelayMs?: number;        // Maximum delay cap
}

// Worker context interface
export interface WorkerContext {
    jobId: string;
    attempt: number;
    logger: Logger;

    // Job control methods
    scheduleRetry(delayMs?: number, reason?: string): Promise<void>;
    terminate(reason: string): Promise<void>;
    reschedule(newScheduledAt: Date, reason?: string): Promise<void>;
}

// Logger interface
export interface Logger {
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

// Worker function type
export type WorkerFunction<TInput = any, TOutput = any> = (
    data: TInput,
    context: WorkerContext
) => Promise<TOutput | void>;

// Worker type registry interface
export interface WorkerTypeMap {
    // Example worker types - extend this interface to add new workers
    "webhook-delivery": {
        input: WebhookDeliveryData;
        output: boolean;
    };
}

// Worker registry interface
export interface WorkerRegistry {
    register<K extends keyof WorkerTypeMap>(
        type: K,
        worker: WorkerFunction<WorkerTypeMap[K]['input'], WorkerTypeMap[K]['output']>
    ): void;

    get(type: string): WorkerFunction | undefined;
    getAll(): Map<string, WorkerFunction>;
}

// Scheduler interface
export interface Scheduler {
    send<K extends keyof WorkerTypeMap>(
        workType: K,
        data: WorkerTypeMap[K]['input'],
        options?: ScheduleOptions
    ): Promise<string>;
}

// Schedule options
export interface ScheduleOptions {
    scheduledAt?: Date;
    maxAttempts?: number;
    retryDelayMs?: number;           // Fixed delay between retries in milliseconds
    retryBackoffMultiplier?: number; // Multiplier for exponential backoff (e.g., 2.0 for doubling)
    maxRetryDelayMs?: number;        // Maximum delay cap for exponential backoff
}

// Job type concurrency configuration
export interface JobTypeConcurrencyConfig {
    maxConcurrency: number;
    priority?: number; // Lower numbers = higher priority (1 = highest)
}

// Worker engine configuration
export interface WorkerEngineConfig {
    // Global fallback for unspecified job types
    defaultMaxConcurrency: number;

    // Type-safe per-job-type limits - keys must match WorkerTypeMap
    jobTypeConcurrency: Partial<Record<keyof WorkerTypeMap, JobTypeConcurrencyConfig>>;

    // Existing config
    pollIntervalMs: number;
    defaultMaxAttempts: number;
    enableRetries: boolean;
}
