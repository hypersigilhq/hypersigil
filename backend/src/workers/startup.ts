import '../types/global-init'; // Initialize global functions
import { workerEngine } from './worker-engine';

/**
 * Initialize and start the worker system
 */
export function startWorkerSystem(config?: {
    maxConcurrency?: number;
    pollIntervalMs?: number;
    enableRetries?: boolean;
}): void {
    // Configure the worker engine
    if (config) {
        workerEngine.updateConfig(config);
    }

    // Start the worker engine
    workerEngine.start();

    console.log('Worker system started successfully');
}

/**
 * Stop the worker system gracefully
 */
export async function stopWorkerSystem(): Promise<void> {
    await workerEngine.stop();
    console.log('Worker system stopped');
}

/**
 * Get worker system status
 */
export function getWorkerSystemStatus() {
    return {
        engine: workerEngine.getStatus(),
        stats: workerEngine.getStats()
    };
}
