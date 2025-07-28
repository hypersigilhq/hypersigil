25-07-09_00-47

# Adjustable Execution Concurrency

## Overview

The execution service now supports adjustable concurrency control, allowing you to configure how many executions can run simultaneously. Additionally, the service automatically loads and processes pending executions on startup.

## Features

### 1. Configurable Concurrency Limit

- **Default**: 1 execution at a time (sequential processing)
- **Adjustable**: Can be set to any value ≥ 1
- **Runtime Configuration**: Can be changed while the service is running

### 2. Startup Initialization

- **Interrupted Execution Recovery**: Automatically detects and resumes running executions that were interrupted during restart
- **Sequential Recovery**: Waits for all running executions to complete before starting any pending executions
- **Auto-load**: Automatically loads all pending executions from database on service startup
- **Priority Processing**: Running executions are processed first, then pending executions
- **Queue Processing**: All executions are queued for processing respecting the concurrency limit
- **Error Handling**: Service initialization failures are logged and cause graceful shutdown

### 3. Intelligent Queue Management

- **Capacity Checking**: Only processes executions up to the configured limit
- **Auto-retry**: Executions that can't be processed immediately are queued for later
- **Next-in-queue**: When an execution completes, the next pending execution is automatically started

## API Methods

### Setting Concurrency Limit

```typescript
// Set maximum concurrent executions
executionService.setMaxConcurrentExecutions(3);

// Get current setting
const currentLimit = executionService.getMaxConcurrentExecutions();
```

### Initialization

```typescript
// Initialize service (called automatically on startup)
await executionService.initialize();
```

### Queue Status

```typescript
// Get current queue status
const status = executionService.getQueueStatus();
// Returns: { processing: number, queuedIds: string[] }
```

## Configuration Examples

### Sequential Processing (Default)
```typescript
executionService.setMaxConcurrentExecutions(1);
```
- Executions run one at a time
- Ensures no resource conflicts
- Predictable execution order

### Parallel Processing
```typescript
executionService.setMaxConcurrentExecutions(5);
```
- Up to 5 executions run simultaneously
- Faster overall throughput
- Higher resource usage

### High Throughput
```typescript
executionService.setMaxConcurrentExecutions(10);
```
- Maximum parallelization
- Best for I/O-bound operations
- Monitor system resources

## Implementation Details

### Concurrency Control

The service uses a `Set<string>` to track currently processing executions and checks against `maxConcurrentExecutions` before starting new ones.

```typescript
private processingQueue: Set<string> = new Set();
private maxConcurrentExecutions: number = 1;
```

### Queue Management

When an execution completes, the service automatically checks for pending executions:

```typescript
private async processNextInQueue(): Promise<void> {
    if (this.processingQueue.size >= this.maxConcurrentExecutions) {
        return; // Already at capacity
    }
    
    // Get next pending execution and queue it
}
```

### Startup Process

1. Service starts with the application
2. `initialize()` is called automatically
3. All pending executions are loaded from database
4. Executions are queued respecting concurrency limits
5. Background worker continues processing

## Benefits

### Performance
- **Configurable throughput**: Adjust based on system capacity
- **Resource optimization**: Prevent system overload
- **Efficient processing**: Automatic queue management

### Reliability
- **Graceful startup**: Handles pending executions from previous sessions
- **Error resilience**: Failed initializations are handled gracefully
- **Consistent state**: Database-driven queue ensures no lost executions

### Flexibility
- **Runtime adjustment**: Change concurrency without restart
- **Environment-specific**: Different settings for dev/staging/production
- **Workload adaptation**: Adjust based on current system load

## Monitoring

### Queue Status
Monitor current processing state:
```typescript
const { processing, queuedIds } = executionService.getQueueStatus();
console.log(`Currently processing: ${processing} executions`);
console.log(`Queued IDs: ${queuedIds.join(', ')}`);
```

### Logs
The service provides detailed logging:
- Initialization status
- Concurrency limit changes
- Queue processing events
- Error conditions

## Best Practices

### Setting Concurrency Limits

1. **Start Conservative**: Begin with low concurrency (1-3)
2. **Monitor Resources**: Watch CPU, memory, and network usage
3. **Provider Limits**: Consider external API rate limits
4. **Gradual Increase**: Incrementally raise limits while monitoring

### Production Considerations

1. **Environment Variables**: Make concurrency configurable via environment
2. **Health Checks**: Monitor queue depth and processing times
3. **Alerting**: Set up alerts for queue backlog or processing failures
4. **Resource Limits**: Ensure adequate system resources for chosen concurrency

## Future Enhancements

- **Dynamic Scaling**: Auto-adjust concurrency based on system load
- **Priority Queues**: Process high-priority executions first
- **Provider-specific Limits**: Different concurrency per provider
- **Metrics Dashboard**: Real-time queue and performance monitoring
