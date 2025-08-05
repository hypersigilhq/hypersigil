# Worker Retry Delay Configuration

The worker system now supports configurable retry delays with exponential backoff. This document explains how to use the new retry delay features.

## Overview

The retry delay system supports:
- Fixed delays between retries
- Exponential backoff with configurable multipliers
- Maximum delay caps to prevent excessive wait times
- Per-job configuration or global defaults

## Default Configuration

The scheduler comes with sensible defaults:
- **Default retry delay**: 5000ms (5 seconds)
- **Default backoff multiplier**: 1.5x
- **Default maximum delay**: 300000ms (5 minutes)
- **Default max attempts**: 3

## Usage Examples

### 1. Using Default Retry Configuration

```typescript
// Jobs will use default retry delays (5s, 7.5s, 11.25s, capped at 5min)
const jobId = await Scheduler.send('processJobDescription', data);
```

### 2. Custom Retry Configuration per Job

```typescript
// Custom retry configuration for a specific job
const jobId = await Scheduler.send('processJobDescription', data, {
    retryDelayMs: 10000,           // Start with 10 second delay
    retryBackoffMultiplier: 2.0,   // Double the delay each time
    maxRetryDelayMs: 120000,       // Cap at 2 minutes
    maxAttempts: 5
});
// Retry delays: 10s, 20s, 40s, 80s, 120s (capped)
```

### 3. Using the Convenience Method

```typescript
// Easier syntax for retry configuration
const jobId = await Scheduler.sendWithRetryConfig('uploadCandidateResume', data, {
    retryDelayMs: 2000,            // 2 second initial delay
    retryBackoffMultiplier: 1.0,   // No backoff (fixed delay)
    maxAttempts: 10
});
// Retry delays: 2s, 2s, 2s, 2s, 2s, 2s, 2s, 2s, 2s
```

### 4. Configuring Global Defaults

```typescript
// Set new defaults for all future jobs
Scheduler.setDefaultRetryDelayMs(3000);           // 3 second base delay
Scheduler.setDefaultRetryBackoffMultiplier(2.0);  // Double each time
Scheduler.setDefaultMaxRetryDelayMs(600000);      // 10 minute cap
Scheduler.setDefaultMaxAttempts(5);
```

### 5. Worker-Controlled Retries

Workers can still control their own retry timing:

```typescript
// In a worker function
export async function myWorker(data: MyData, context: WorkerContext) {
    try {
        // ... do work
    } catch (error) {
        // Use job's configured retry delay (automatic calculation)
        await context.scheduleRetry(undefined, 'Network error occurred');
        
        // Or override with custom delay
        await context.scheduleRetry(30000, 'Custom 30 second delay');
    }
}
```

## Retry Delay Calculation

The system calculates retry delays using exponential backoff:

```
delay = baseDelay * (backoffMultiplier ^ attemptNumber)
finalDelay = min(delay, maxRetryDelayMs)
```

### Examples:

**Configuration**: `retryDelayMs: 1000, backoffMultiplier: 2.0, maxRetryDelayMs: 60000`
- Attempt 1: 1000ms
- Attempt 2: 2000ms  
- Attempt 3: 4000ms
- Attempt 4: 8000ms
- Attempt 5: 16000ms
- Attempt 6: 32000ms
- Attempt 7: 60000ms (capped)

**Configuration**: `retryDelayMs: 5000, backoffMultiplier: 1.0` (fixed delay)
- All attempts: 5000ms

## Best Practices

1. **Use exponential backoff** for external API calls to avoid overwhelming services
2. **Set reasonable maximum delays** to prevent jobs from being delayed too long
3. **Use fixed delays** for internal operations that don't benefit from backoff
4. **Configure per-job** for operations with specific timing requirements
5. **Monitor retry patterns** to optimize delay configurations

## Backward Compatibility

All existing code continues to work unchanged:
- Workers calling `context.scheduleRetry(5000)` with explicit delays work as before
- Jobs without retry configuration use the default settings
- The system gracefully handles missing configuration values
