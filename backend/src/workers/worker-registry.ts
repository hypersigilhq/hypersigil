import { WorkerFunction, WorkerTypeMap } from './types';

class WorkerRegistryImpl {
    private workers = new Map<string, WorkerFunction>();

    /**
     * Register a worker with type safety
     */
    register<K extends keyof WorkerTypeMap>(
        type: K,
        worker: WorkerFunction<WorkerTypeMap[K]['input'], WorkerTypeMap[K]['output']>
    ): void {
        this.workers.set(type as string, worker);
    }

    /**
     * Register a worker without type constraints (for dynamic registration)
     */
    registerDynamic(type: string, worker: WorkerFunction): void {
        this.workers.set(type, worker);
    }

    /**
     * Get a worker by type
     */
    get(type: string): WorkerFunction | undefined {
        return this.workers.get(type);
    }

    /**
     * Get all registered workers
     */
    getAll(): Map<string, WorkerFunction> {
        return new Map(this.workers);
    }

    /**
     * Check if a worker type is registered
     */
    has(type: string): boolean {
        return this.workers.has(type);
    }

    /**
     * Get all registered worker types
     */
    getTypes(): string[] {
        return Array.from(this.workers.keys());
    }

    /**
     * Unregister a worker
     */
    unregister(type: string): boolean {
        return this.workers.delete(type);
    }

    /**
     * Clear all workers
     */
    clear(): void {
        this.workers.clear();
    }

    /**
     * Get worker count
     */
    count(): number {
        return this.workers.size;
    }
}

// Export singleton instance
export const WorkerRegistry = new WorkerRegistryImpl();
