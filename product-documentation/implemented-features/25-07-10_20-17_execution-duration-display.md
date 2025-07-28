25-07-10_20-17

# Execution Duration Display

## Overview
Implemented duration computation and display functionality in the ExecutionsTable component to show how long executions take to complete.

## Implementation Details

### Duration Calculation Logic
The `formatDuration` function calculates execution duration based on different execution states:

1. **Not Started**: Returns `-` when `started_at` is null
2. **Completed**: Uses `completed_at - started_at` for finished executions
3. **Running**: Uses `current_time - started_at` for active executions
4. **Failed/Cancelled**: Returns `-` when execution ended without completion

### Duration Formatting
The duration is formatted in a human-readable way with appropriate units:

- **Seconds**: `30s` (for durations under 1 minute)
- **Minutes**: `5m 30s` or `5m` (for durations under 1 hour)
- **Hours**: `2h 15m` or `2h` (for durations under 1 day)
- **Days**: `3d 5h` or `3d` (for longer durations)

### Real-time Updates
For running executions, the duration updates automatically through the existing auto-refresh mechanism that polls every 5 seconds when there are active executions.

## User Interface

### Location
The duration is displayed in the execution details dialog in the timing information section, alongside:
- Created timestamp
- Started timestamp  
- Completed timestamp

### Visual Design
- Consistent with existing timestamp formatting
- Uses the same text styling and layout as other metadata fields
- Shows `-` for executions that haven't started or failed without timing data

## Technical Implementation

### Function Signature
```typescript
const formatDuration = (execution: ExecutionResponse) => string
```

### Key Features
- Handles edge cases (negative durations, missing timestamps)
- Provides live updates for running executions
- Graceful fallback to `-` for invalid states
- Efficient calculation using millisecond precision

## Benefits
- **User Insight**: Users can see how long their executions take
- **Performance Monitoring**: Helps identify slow-running prompts
- **Real-time Feedback**: Live duration updates for running executions
- **Consistent UX**: Follows existing design patterns in the application

## Future Enhancements
- Could add duration column to the main executions table
- Average duration statistics in the stats cards
- Duration-based filtering and sorting options
- Performance alerts for unusually long executions
