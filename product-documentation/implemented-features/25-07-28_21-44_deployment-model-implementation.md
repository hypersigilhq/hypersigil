# Deployment Model Implementation

**Date:** 28-07-28 21:44  
**Feature:** Deployment model with CRUD endpoints and run functionality for prompt execution management

## Overview

Implemented a comprehensive deployment system that allows users to create named configurations for prompt execution. Deployments act as pre-configured execution endpoints that combine a prompt, provider, and model into a reusable unit with a unique slug-based name.

## Technical Implementation

### Database Model

**File:** `backend/src/models/deployment.ts`

- **Interface:** `Deployment` extending `BaseDocument`
- **Fields:**
  - `name`: string (slug format, unique across table)
  - `promptId`: string (UUID reference to prompt)
  - `provider`: string (AI provider name)
  - `model`: string (model name)
- **Validation:** Name uniqueness enforced at model level
- **Search:** Full-text search across name, provider, and model fields
- **Methods:** Custom finders by name, promptId, and provider

### API Definitions

**File:** `backend/src/api/definitions/deployment.ts`

- **Request Schemas:**
  - `CreateDeploymentRequestSchema`: Name validation with slug regex pattern
  - `UpdateDeploymentRequestSchema`: Optional fields for partial updates
  - `RunDeploymentRequestSchema`: User input, execution options, trace ID, file ID
- **Response Schemas:**
  - `DeploymentResponseSchema`: Complete deployment data
  - `RunDeploymentResponseSchema`: Execution IDs array
- **Endpoints:** Full CRUD operations plus run functionality

### API Handlers

**File:** `backend/src/api/handlers/deployment.ts`

- **CRUD Operations:**
  - `list`: Paginated listing with search functionality
  - `create`: Validates prompt existence and provider:model combination
  - `getById`: Retrieve by UUID
  - `getByName`: Retrieve by slug name
  - `update`: Partial updates with validation
  - `delete`: Soft deletion
- **Execution Operations:**
  - `run`: Execute deployment by ID
  - `runByName`: Execute deployment by slug name
- **Validation:** Provider registry integration

## API Endpoints

### Base URL: `/api/v1/deployments`

#### CRUD Operations
- `GET /` - List deployments with pagination and search
- `POST /` - Create new deployment
- `GET /:id` - Get deployment by ID
- `GET /name/:name` - Get deployment by slug name
- `PUT /:id` - Update deployment
- `DELETE /:id` - Delete deployment

#### Execution Operations
- `POST /:id/run` - Execute deployment by ID
- `POST /name/:name/run` - Execute deployment by slug name

## Key Features

### Slug-Based Naming
- Deployment names must follow slug format: lowercase letters, numbers, hyphens, underscores
- Names are unique across the entire deployments table
- Enables friendly URL access via `/name/:name` endpoints

### Provider Validation
- Validates provider:model combinations against provider registry
- Ensures only available providers and models can be used
- Prevents creation of invalid deployment configurations

### Execution Integration
- Run endpoints create executions using existing execution service
- Supports all execution options: temperature, maxTokens, etc.
- Maintains trace IDs and file upload support
- Returns execution IDs for tracking

### Permission System
- Added deployment permissions to API key system:
  - `deployments:run` - Execute deployments

## Architecture Benefits

### Reusability
- Deployments encapsulate prompt + provider + model configurations
- Eliminates need to specify these parameters on each execution
- Enables consistent execution environments

### API Simplification
- Run endpoints provide simplified execution interface
- Reduces API call complexity for common execution patterns
- Supports both ID-based and name-based access

### Configuration Management
- Centralized management of execution configurations
- Easy updates to provider/model combinations
- Maintains execution history tied to deployment configurations

## Integration Points

### Execution Service
- Leverages existing `executionService.createExecution()` method
- Maintains compatibility with current execution workflow
- Preserves all execution tracking and monitoring features

### Provider Registry
- Validates provider:model combinations at creation/update time
- Ensures deployment configurations remain valid
- Prevents runtime errors from invalid provider configurations

### Authentication System
- Integrates with existing API key permission system
- Supports fine-grained access control
- Maintains security boundaries for deployment operations

## Usage Examples

### Creating a Deployment
```json
POST /api/v1/deployments
{
  "name": "my-chatbot-gpt4",
  "promptId": "uuid-of-prompt",
  "provider": "openai",
  "model": "gpt-4"
}
```

### Running a Deployment
```json
POST /api/v1/deployments/name/my-chatbot-gpt4/run
{
  "userInput": "Hello, how are you?",
  "options": {
    "temperature": 0.7,
    "maxTokens": 150
  }
}
```

This implementation provides a robust foundation for deployment-based prompt execution management while maintaining compatibility with existing system architecture.
