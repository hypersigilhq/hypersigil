# Per-Job-Type Concurrency System

**Date:** 05-08-25 21:50  
**Feature:** Worker Engine Per-Job-Type Concurrency Control

## Overview

Implemented a sophisticated per-job-type concurrency control system in the worker engine that allows different job types to have their own dedicated concurrency limits and priority levels. This ensures critical job types like webhook delivery get reserved capacity and priority processing.

## Key Features

### 1. Type-Safe Configuration
- **JobTypeConcurrencyConfig Interface**: Defines concurrency limits and priority for each job type
- **Type-Safe Keys**: Configuration keys are typed based on `WorkerTypeMap` for compile-time safety
- **Priority System**: Lower numbers indicate higher priority (1 = highest priority)

### 2. Reserved Capacity Model
- Each job type gets its own dedicated "slot pool"
- Webhook delivery gets 10 dedicated concurrent slots
- Other job types use the default concurrency limit (3)
- No job type can starve others of their reserved capacity

### 3. Priority-Based Scheduling
- Jobs are processed in priority order when multiple types have capacity
- Webhook delivery (priority 1) is always processed first
- Ensures critical notifications reach clients quickly

### 4. Enhanced Tracking System
- **Per-Type Tracking**: `runningJobsByType` Map tracks jobs by type
- **Capacity Checking**: Real-time capacity validation before job processing
- **Status Reporting**: Detailed breakdown of running jobs by type

## Technical Implementation

### Configuration Structure
```typescript
interface JobTypeConcurrencyConfig {
    maxConcurrency: number;
    priority?: number; // Lower numbers = higher priority (1 = highest)
}

interface WorkerEngineConfig {
    defaultMaxConcurrency: number;
    jobTypeConcurrency: Partial<Record<keyof WorkerTypeMap, JobTypeConcurrencyConfig>>;
    pollIntervalMs: number;
    defaultMaxAttempts: number;
    enableRetries: boolean;
}
```

### Default Configuration
```typescript
export const workerEngine = new WorkerEngine({
    defaultMaxConcurrency: 3,
    jobTypeConcurrency: {
        'webhook-delivery': {
            maxConcurrency: 10,
            priority: 1 // Highest priority - process webhooks first
        }
    },
    pollIntervalMs: 1000,
    defaultMaxAttempts: 3,
    enableRetries: true
});
```

### Enhanced Job Model
Added `getNextPendingJobByType(jobType: string)` method to efficiently query jobs by type:
- Queries pending jobs of specific type first
- Falls back to retry jobs that are ready
- Optimized SQL queries with proper indexing

### Smart Job Selection Algorithm
1. **Capacity Check**: Identify job types with available capacity
2. **Priority Sort**: Order available types by priority (webhook-delivery first)
3. **Fair Processing**: Process one job per poll cycle to maintain fairness
4. **Type-Specific Limits**: Respect individual concurrency limits per type

## Benefits

### 1. Resource Isolation
- Critical job types (webhook delivery) won't be blocked by heavy processing jobs
- Each job type has guaranteed capacity allocation
- Prevents resource starvation scenarios

### 2. Better Resource Utilization
- I/O-bound jobs (webhooks) can run at higher concurrency without affecting CPU-intensive tasks
- Optimal resource allocation based on job characteristics
- Improved overall system throughput

### 3. Type Safety
- Compile-time validation of job type names in configuration
- IntelliSense support for job type configuration
- Prevents typos and configuration errors

### 4. Flexible Scaling
- Easy to adjust limits per job type without affecting others
- Runtime configuration updates supported
- Extensible for new job types

### 5. Enhanced Monitoring
- Per-job-type status reporting
- Detailed logging with concurrency information
- Better observability into system performance

## Usage Examples

### Adding New Job Types
```typescript
// 1. Add to WorkerTypeMap in types.ts
interface WorkerTypeMap {
    "webhook-delivery": { input: WebhookDeliveryData; output: boolean; };
    "email-sending": { input: EmailData; output: boolean; };
    "heavy-processing": { input: ProcessingData; output: ProcessingResult; };
}

// 2. Configure concurrency limits
const config = {
    defaultMaxConcurrency: 3,
    jobTypeConcurrency: {
        'webhook-delivery': { maxConcurrency: 10, priority: 1 },
        'email-sending': { maxConcurrency: 5, priority: 2 },
        'heavy-processing': { maxConcurrency: 2, priority: 3 }
    }
}
```

### Runtime Configuration Updates
```typescript
// Update configuration at runtime
workerEngine.updateConfig({
    jobTypeConcurrency: {
        'webhook-delivery': { maxConcurrency: 15, priority: 1 }
    }
});
```

### Status Monitoring
```typescript
const status = workerEngine.getStatus();
console.log('Running jobs by type:', status.runningJobsByType);
// Output: { 'webhook-delivery': 3, 'email-sending': 1 }
```

## Performance Characteristics

### Webhook Delivery Optimization
- **High Concurrency**: Up to 10 concurrent webhook deliveries
- **Highest Priority**: Always processed first when capacity available
- **Fast Response**: Minimal waiting time for webhook jobs
- **Resource Efficient**: I/O-bound operations don't consume CPU resources

### System Stability
- **Controlled Resource Usage**: Each job type has bounded concurrency
- **Graceful Degradation**: System remains stable under high load
- **Fair Resource Allocation**: No single job type can monopolize resources

## Migration Notes

### Backward Compatibility
- Existing job types without specific configuration use `defaultMaxConcurrency`
- No breaking changes to existing worker implementations
- Gradual migration path for existing systems

### Database Optimization
- Added job type indexing for efficient queries
- Optimized SQL queries for type-specific job retrieval
- Maintained existing job model compatibility

## Future Enhancements

### Potential Improvements
1. **Dynamic Priority Adjustment**: Adjust priorities based on queue depth
2. **Load-Based Scaling**: Automatically adjust concurrency based on system load
3. **Job Type Metrics**: Detailed performance metrics per job type
4. **Circuit Breaker**: Automatic job type disabling on repeated failures
5. **Weighted Fair Queuing**: More sophisticated scheduling algorithms

### Configuration Extensions
1. **Time-Based Limits**: Different concurrency limits based on time of day
2. **Resource-Based Limits**: Concurrency based on available system resources
3. **Dependency Management**: Job type dependencies and ordering
4. **Rate Limiting**: Per-job-type rate limiting capabilities

## Testing Recommendations

### Unit Tests
- Test capacity checking logic for each job type
- Verify priority-based job selection
- Test configuration validation and type safety

### Integration Tests
- Test concurrent job processing across multiple types
- Verify webhook delivery gets priority under load
- Test graceful degradation scenarios

### Performance Tests
- Load testing with mixed job types
- Webhook delivery latency under various loads
- System stability under sustained high concurrency

## Conclusion

The per-job-type concurrency system provides a robust foundation for scalable job processing with guaranteed resource allocation and priority-based scheduling. The webhook delivery optimization ensures critical client notifications are processed with minimal latency while maintaining system stability and resource efficiency.
