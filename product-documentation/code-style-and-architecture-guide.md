# Hypersigil Code Style and Architecture Guide

## Overview

This document outlines the code style, architecture patterns, and logic distribution across the Hypersigil backend codebase. The architecture follows a layered approach with clear separation of concerns between models, API definitions, and handlers.

## Architecture Layers

### 1. Database Layer (`backend/src/database/`)

**Base Model (`base-model.ts`)**
- Abstract base class for all models
- Handles SQLite JSON document storage with automatic serialization/deserialization
- Provides CRUD operations, pagination, search, and JSON path queries
- Automatic date field conversion based on naming patterns (`_at$`, `_date$`, `_until$`, etc.)
- Model registration system for table management

**Key Patterns:**
- All models extend `Model<T extends BaseDocument>`
- Documents stored as JSON with separate `id`, `created_at`, `updated_at` columns
- Automatic UUID generation for new documents
- JSON path queries for nested property searches
- Built-in pagination with `findWithPagination()`

### 2. Model Layer (`backend/src/models/`)

**Purpose:** Business logic and data access methods specific to each entity

**Structure:**
```typescript
export interface EntityDocument extends BaseDocument {
    // Entity-specific properties with proper typing
}

export class EntityModel extends Model<EntityDocument> {
    protected tableName = 'entities';
    
    // Business-specific query methods
    // Validation and business rules
    // Complex operations combining multiple queries
}

// Export singleton instance
export const entityModel = new EntityModel();
```

**What Goes Here:**
- **Interface definitions** for document structure
- **Business logic methods** (e.g., `createInvitation()`, `activateUser()`)
- **Specialized queries** (e.g., `findByEmail()`, `findByRole()`)
- **Data validation** and business rules
- **Complex operations** that involve multiple database calls
- **Domain-specific calculations** and transformations

**What Doesn't Go Here:**
- HTTP request/response handling
- API validation (handled by Zod schemas)
- Response formatting
- Authentication/authorization logic

### 3. API Definitions Layer (`backend/src/api/definitions/`)

**Purpose:** Single source of truth for API contracts using ts-typed-api and Zod

**Structure:**
```typescript
// Zod schemas for validation
export const EntitySchema = z.object({
    id: z.string(),
    // ... properties
});

// Inferred types
export type Entity = z.infer<typeof EntitySchema>;

// Request/response schemas
export const createEntityBodySchema = z.object({
    // ... request properties
});

export const createEntityResponseSchema = EntitySchema;

// API definition
export const EntityApiDefinition = CreateApiDefinition({
    prefix: '/api/v1/entities',
    endpoints: {
        entities: {
            create: {
                method: 'POST',
                path: '/',
                body: createEntityBodySchema,
                responses: CreateResponses({
                    201: createEntityResponseSchema,
                    400: ErrorResponseSchema,
                    500: ErrorResponseSchema
                })
            }
        }
    }
});
```

**What Goes Here:**
- **Zod schemas** for all request/response validation
- **Type definitions** inferred from schemas
- **API endpoint definitions** with proper HTTP methods and paths
- **Response status codes** and their corresponding schemas
- **Reusable schemas** and types for the domain

**Self-Contained Rule:**
- MUST be completely self-contained
- Only import from external packages (`zod`, `ts-typed-api`) or other definition files
- NEVER import from internal backend modules or UI modules
- All types needed by both backend and UI must be defined here

### 4. Handler Layer (`backend/src/api/handlers/`)

**Purpose:** HTTP request/response handling and orchestration

**Structure:**
```typescript
import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { entityModel } from '../../models/entity';
import { EntityApiDefinition } from '../definitions/entity';

// Response formatting functions
function formatEntityForResponse(entity: EntityDocument): EntityResponse {
    return {
        // Transform model data to API response format
        // Handle date serialization
        // Remove sensitive fields
    };
}

RegisterHandlers(app, EntityApiDefinition, {
    entities: {
        create: async (req, res) => {
            // 1. Extract and validate data (already validated by Zod)
            // 2. Call model methods
            // 3. Format response
            // 4. Handle errors appropriately
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
```

**What Goes Here:**
- **HTTP request handling** and parameter extraction
- **Response formatting** functions
- **Error handling** and appropriate HTTP status codes
- **Orchestration** of model method calls
- **Middleware configuration** for the endpoints
- **Date serialization** for API responses
- **Security filtering** (removing sensitive fields)

**What Doesn't Go Here:**
- Business logic (belongs in models)
- Complex data transformations (belongs in models)
- Database queries (belongs in models)
- Validation logic (handled by Zod schemas)

## Code Style Guidelines

### Naming Conventions

**Use camelCase everywhere:**
- Variables, functions, properties: `userName`, `createdAt`
- Database fields: `created_at` → `createdAt` in code
- API properties: `user_id` → `userId` in responses

**File naming:**
- Models: `user.ts`, `execution.ts`
- Definitions: `user.ts`, `execution.ts` 
- Handlers: `user.ts`, `execution.ts`

### TypeScript Patterns

**Interface definitions:**
```typescript
export interface UserDocument extends BaseDocument {
    email: string;
    name: string;
    role: 'admin' | 'user' | 'viewer';
    profile?: {
        timezone?: string;
    };
}
```

**Model methods:**
```typescript
async findByEmail(email: string): Promise<UserDocument | null> {
    return this.findOne({ email });
}
```

**Response formatting:**
```typescript
function formatUserForResponse(user: UserDocument): UserResponse {
    const { auth, ...publicUser } = user; // Remove sensitive data
    return {
        ...publicUser,
        created_at: user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at
    };
}
```

### Error Handling

**Global Result Pattern:**
```typescript
// Available globally
type Result<T, E = string> = { success: true; data: T } | { success: false; error: E };
function Ok<T>(data: T): Result<T, never>;
function Err<E>(error: E): Result<never, E>;

// Usage (when implemented)
function parseData(input: string): Result<ParsedData, string> {
    try {
        const data = JSON.parse(input);
        return Ok(data);
    } catch (error) {
        return Err('Invalid JSON');
    }
}
```

**HTTP Error Responses:**
```typescript
// In handlers
if (!user) {
    return res.respond(404, {
        error: 'Not Found',
        message: 'User not found'
    });
}
```

### Database Patterns

**Model queries:**
```typescript
// Simple queries
const user = await userModel.findById(id);
const users = await userModel.findByRole('admin');

// Complex queries with pagination
const result = await userModel.findWithPagination({
    page: 1,
    limit: 10,
    where: { status: 'active' },
    orderBy: 'created_at',
    orderDirection: 'DESC'
});

// Search functionality
const users = await userModel.search('name', searchTerm);
```

**JSON property updates:**
```typescript
// For updating nested JSON properties
await userModel.updateJsonProperties(userId, { 
    'profile.timezone': 'UTC',
    'settings.theme': 'dark' 
});
```

### API Definition Patterns

**Schema organization:**
```typescript
// Base schemas
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string()
});

// Derived schemas
export const PublicUserSchema = UserSchema.omit({ auth: true });
export const UserSummarySchema = UserSchema.pick({ id: true, name: true, email: true });

// Request schemas
export const createUserBodySchema = z.object({
    email: z.string().email(),
    name: z.string().min(1)
});

// Response schemas
export const createUserResponseSchema = PublicUserSchema;
```

**Pagination patterns:**
```typescript
export const listUsersQuerySchema = PaginationQuerySchema.extend({
    role: UserRoleSchema.optional(),
    search: z.string().optional()
});

export const listUsersResponseSchema = createPaginationResponseSchema(UserSummarySchema);
```

## Best Practices

### Models
- Keep business logic in models, not handlers
- Use descriptive method names that explain the business operation
- Implement proper error handling within model methods
- Use the base model's built-in methods when possible
- Export singleton instances for dependency injection

### API Definitions
- Define comprehensive Zod schemas for all inputs/outputs
- Use union types for polymorphic data (e.g., comment types)
- Leverage schema composition with `.extend()`, `.omit()`, `.pick()`
- Define proper HTTP status codes for all scenarios
- Keep schemas self-contained and reusable

### Handlers
- Keep handlers thin - delegate to model methods
- Format responses consistently using helper functions
- Handle all error cases with appropriate HTTP status codes
- Use middleware for cross-cutting concerns (auth, logging, timing)
- Validate business rules in models, not handlers

### Error Handling
- Use the global Result pattern for internal functions (when implemented)
- Return appropriate HTTP status codes in handlers
- Provide meaningful error messages
- Log errors appropriately but don't expose internal details to clients

### Comments
- Avoid comments for straightforward operations
- Use comments only for complex business logic or non-obvious code
- Prefer self-documenting code with clear method and variable names
- Document public API methods with JSDoc when helpful

## Architecture Benefits

1. **Type Safety**: End-to-end type safety from database to API responses
2. **Single Source of Truth**: API definitions serve both backend and frontend
3. **Separation of Concerns**: Clear boundaries between layers
