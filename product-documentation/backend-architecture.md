# Backend Architecture Documentation

## Overview

Hypersigil backend is a TypeScript-based API server built with Express.js and ts-typed-api package for type-safe API definitions. The architecture follows a modular design with clear separation of concerns across API definitions, handlers, models, services, and providers.

## Core Technologies

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Express.js
- **API Type Safety**: ts-typed-api package
- **Database**: SQLite with custom JSON-based document storage
- **Authentication**: JWT tokens with cookie/header support
- **Background Jobs**: Custom worker system with per-job-type concurrency

## Directory Structure

```
backend/src/
├── api/                    # API layer
│   ├── definitions/        # Type-safe API contracts (shared with frontend)
│   └── handlers/          # API endpoint implementations
├── config/                # Configuration management
├── database/              # Database layer
├── models/                # Data models with SQLite integration
├── providers/             # AI provider integrations
├── services/              # Business logic services
├── types/                 # TypeScript type definitions
├── util/                  # Utility functions
├── workers/               # Background job processing system
├── app.ts                 # Express application setup
└── index.ts               # Application entry point
```

## API Architecture

### API Definitions System
- All API contracts defined in `api/definitions/` using ts-typed-api package
- Definitions are symlinked to frontend for type sharing
- Self-contained definition files with no internal backend dependencies
- Zod schemas for request/response validation

### API Handlers
- Located in `api/handlers/` with one-to-one mapping to definition files
- Implement business logic using services and models
- Type-safe request/response handling using definition types
- Consistent error handling and validation

### Authentication & Authorization
- JWT-based authentication with cookie and Bearer token support
- API key authentication for external integrations
- Role-based access control (admin, user roles)
- Middleware-based authentication pipeline

## Database Layer

### Architecture
- SQLite database with custom JSON document storage
- Base model class providing CRUD operations
- Virtual columns for performance optimization on frequently queried fields
- Automatic timestamp management (created_at, updated_at)

### Models
- Abstract base model with generic document operations
- JSON-based storage with automatic serialization/deserialization
- Query builder with WHERE clause support
- Pagination and filtering capabilities
- Date field auto-conversion based on naming patterns

### Migration System
- Version-controlled database migrations
- Automatic migration execution on startup
- Migration registry for tracking applied changes

## Business Logic Services

### Execution Service
- Manages AI prompt execution lifecycle
- Supports batch execution for test data groups
- Integration with AI providers through provider registry
- Execution bundling for grouped operations

### Authentication Service
- JWT token generation and validation
- User session management
- Password hashing and verification
- Account lockout protection

### Prompt Service
- Prompt versioning and management
- Mustache template compilation with test data
- Input validation against JSON schemas
- Prompt adjustment and calibration features

### Onboarding Service
- User invitation system
- First-time setup workflows
- Account activation processes

## AI Provider System

### Provider Architecture
- Abstract base provider interface
- Support for multiple AI providers (OpenAI, Anthropic, Ollama)
- Unified execution interface with provider-specific implementations
- File upload support for multimodal interactions

### Provider Registry
- Dynamic provider configuration from database settings
- Provider availability checking
- Model enumeration and validation
- Provider-specific concurrency limits

### Execution Options
- JSON schema support for structured outputs
- Temperature, top-p, top-k parameter control
- File attachment handling
- Token usage tracking

## Background Job System

### Worker Engine
- Per-job-type concurrency control
- Priority-based job scheduling
- Exponential backoff retry mechanism
- Job status tracking and monitoring

### Job Types
- Webhook delivery jobs with high priority
- Execution processing jobs
- Cleanup and maintenance jobs
- Extensible job type registration

### Worker Context
- Job-specific logging and context
- Retry and termination control
- Progress tracking capabilities

## Data Models

### Core Models
- **User**: User accounts with role-based permissions
- **Prompt**: Versioned prompt templates with JSON schema support
- **Execution**: AI execution records with status tracking
- **ExecutionBundle**: Grouped executions for batch operations
- **TestDataGroup/Item**: Test data management for prompt testing
- **File**: File upload storage with base64 encoding
- **Deployment**: Prompt deployment configurations
- **ApiKey**: API access key management
- **Settings**: Application configuration storage

### Model Features
- Automatic ID generation using UUID
- JSON-based flexible schema storage
- Virtual columns for query optimization
- Soft delete capabilities where applicable
- Audit trail with created/updated timestamps

## Configuration Management

### Environment Configuration
- Environment-based configuration loading
- Default values with environment overrides
- Encryption key management
- Development/production mode detection

### Settings System
- Database-stored application settings
- Dynamic configuration updates
- Provider API key management
- Webhook destination configuration

## Security Features

### Authentication
- JWT token-based authentication
- API key authentication for external access
- Session management with configurable expiration
- Account lockout after failed attempts

### Authorization
- Role-based access control
- Permission-based API key scoping
- Resource-level access validation
- Middleware-based authorization checks

### Data Protection
- Encryption for sensitive data storage
- Secure API key generation and storage
- Input validation and sanitization
- SQL injection prevention through prepared statements

## Error Handling

### Global Error Handling
- Uncaught exception and unhandled rejection handlers
- Express error middleware for API errors
- Structured error responses
- Development vs production error exposure

### Provider Error Handling
- Provider-specific error types
- Timeout and availability error handling
- Retry logic for transient failures
- Graceful degradation strategies

## Performance Optimizations

### Database Optimizations
- Virtual columns for frequently queried JSON fields
- Prepared statement caching
- Efficient pagination with offset/limit
- JSON path indexing for complex queries

### Concurrency Management
- Per-provider execution limits
- Job type-specific concurrency controls
- Resource pooling and connection management
- Background job processing isolation

## Monitoring and Logging

### Request Logging
- HTTP request/response logging with Morgan
- Endpoint-specific timing middleware
- Authentication and authorization logging
- Error tracking and reporting

### Job Monitoring
- Job status tracking and statistics
- Worker engine performance metrics
- Failed job analysis and retry tracking
- Background job queue monitoring

## Startup Sequence

1. Global error handlers registration
2. Database model initialization
3. Migration system execution
4. Service initialization (execution worker)
5. Background worker system startup
6. Express server binding and listening
7. Graceful shutdown handler registration

## Integration Points

### Frontend Integration
- Shared API definitions through symlinks
- Type-safe API client generation
- Real-time updates through polling
- File upload and download endpoints

### External Integrations
- AI provider APIs (OpenAI, Anthropic, Ollama)
- Webhook delivery system
- File storage and retrieval
- API key-based external access
