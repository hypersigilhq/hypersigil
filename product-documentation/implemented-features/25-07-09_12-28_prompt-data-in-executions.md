25-07-09_12-28

# Prompt Data in Executions API

## Overview
Implemented prompt data retrieval for execution endpoints to provide comprehensive execution information.

## Changes
- Updated `list` and `getById` handlers in `execution-handlers.ts`
- Added batch prompt fetching for list endpoint to optimize performance
- Implemented fallback for missing prompts to maintain data integrity

## Key Improvements
- Efficient batch fetching of prompts for multiple executions
- Graceful handling of missing prompt data
- Consistent response structure matching the `ExecutionResponseSchema`

## Technical Details
- Uses `Promise.all()` for parallel prompt retrieval in list endpoint
- Creates a `Map` for O(1) prompt lookup
- Provides a default "Unknown Prompt" object if prompt is not found

## Performance Considerations
- Reduces database queries by using batch fetching
- Minimizes potential performance impact of prompt retrieval
