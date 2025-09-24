# Deployment Embedding Model Implementation

## Overview
Implemented a deployment-embedding model that allows scheduling embedding generation jobs using the existing VoyageAI embeddings API service. This provides a structured way to manage and track embedding generation tasks with proper status tracking and result storage.

## Architecture

### Model (`backend/src/models/deployment-embedding.ts`)
- **DeploymentEmbedding** interface extending BaseDocument
- **DeploymentEmbeddingModel** class with CRUD operations and custom methods
- Status tracking: `pending`, `running`, `completed`, `failed`
- Job tracking with `jobId` reference to background worker jobs
- Result storage for completed embeddings

### API Definitions (`backend/src/api/definitions/deployment-embedding.ts`)
- Full CRUD API with Zod validation schemas
- Endpoints: `GET /`, `POST /`, `GET /:id`, `GET /name/:name`, `PUT /:id`, `DELETE /:id`, `POST /run/:name`
- Proper request/response validation for embedding parameters
- Pagination and search support

### API Handlers (`backend/src/api/handlers/deployment-embedding.ts`)
- Complete CRUD implementation following existing patterns
- `run` endpoint schedules `generate-embedding` worker jobs
- Status validation prevents running completed jobs
- Proper error handling and validation

### Worker Integration (`backend/src/workers/workers/generate-embedding.ts`)
- Extended `GenerateEmbeddingData` interface with optional `deploymentEmbeddingId`
- Automatic status updates on job completion/failure
- Result storage in deployment-embedding records
- Error handling for all termination scenarios

## Key Features

### Job Scheduling
- `POST /api/v1/deployment-embeddings/run/:name` schedules embedding generation
- Uses existing `Scheduler.sendNow()` for immediate job execution
- Returns `jobId` for tracking

### Status Tracking
- Real-time status updates: `pending` → `running` → `completed`/`failed`
- Job status synchronized with deployment-embedding records
- Error messages stored for failed jobs

### Result Storage
- Completed embeddings stored directly in deployment-embedding records
- Full VoyageAI result structure preserved (embeddings array, model, totalTokens)
- Accessible via standard CRUD endpoints

### Validation & Security
- Name uniqueness validation (slug format)
- Input validation (string or string array)
- Model validation against supported VoyageAI models
- API key authentication with `deployment-embeddings:run` scope
- Status-based operation restrictions

## API Endpoints

### CRUD Operations
- `GET /api/v1/deployment-embeddings/` - List with pagination/search
- `POST /api/v1/deployment-embeddings/` - Create new deployment embedding
- `GET /api/v1/deployment-embeddings/:id` - Get by ID
- `GET /api/v1/deployment-embeddings/name/:name` - Get by name
- `PUT /api/v1/deployment-embeddings/:id` - Update (only when pending)
- `DELETE /api/v1/deployment-embeddings/:id` - Delete (only when not running)

### Job Execution
- `POST /api/v1/deployment-embeddings/run/:name` - Schedule embedding job

## Database Schema
```sql
CREATE TABLE deployment_embeddings (
    id VARCHAR(36) PRIMARY KEY,
    data JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Integration Points

### Worker System
- Leverages existing `generate-embedding` worker
- Automatic job completion handling
- Error propagation to deployment records

### Authentication
- API key authentication required
- New permission: `deployment-embeddings:run`
- Integrated with existing auth middleware

### VoyageAI Service
- Uses existing embeddings API service
- Supports all VoyageAI models and input types
- Proper error handling and retry logic

## Usage Example

```typescript
// Create deployment embedding
const response = await fetch('/api/v1/deployment-embeddings/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'my-embedding-job',
        inputs: ['Hello world', 'How are you?'],
        model: 'voyage-3-large',
        inputType: 'document'
    })
});

// Run the job
const runResponse = await fetch('/api/v1/deployment-embeddings/run/my-embedding-job', {
    method: 'POST'
});

// Check status
const statusResponse = await fetch('/api/v1/deployment-embeddings/name/my-embedding-job');
const result = await statusResponse.json();
// result.status: 'completed'
// result.result: { embeddings: [...], model: 'voyage-3-large', totalTokens: 42 }
```

## Error Handling

### Validation Errors
- Invalid name format (must be slug)
- Duplicate names
- Invalid model/input combinations
- Missing required fields

### Runtime Errors
- API key configuration issues
- Network failures (with retry)
- Input validation failures
- Service unavailability

### Status Validation
- Cannot run completed jobs
- Cannot update running jobs
- Cannot delete running jobs

## Security Considerations

- API key authentication required for all operations
- Scoped permissions prevent unauthorized access
- Input validation prevents injection attacks
- Status checks prevent race conditions

## Performance Characteristics

- Asynchronous job processing with worker concurrency limits
- Database indexing on status for efficient queries
- Pagination for large result sets
- Minimal memory footprint with streaming job processing

## Future Enhancements

- Batch job scheduling
- Job prioritization
- Result caching
- Webhook notifications
- Advanced filtering and search
- Job history and analytics
