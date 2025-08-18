# Project Isolation Architecture - Multi-Tenant Data Separation

## Overview

This document outlines the implementation of project-based data isolation in Hypersigil, where every entity is scoped to a specific project to ensure complete data separation between different projects/tenants.

## Architecture Approach

**Selected Approach**: Project ID column-based isolation with middleware-enforced context

- Each table gets a `project_id` field
- Middleware extracts project ID from `x-project-id` header
- Factory pattern provides project-scoped model instances
- Complete data isolation at the application level

## Database Schema Changes

### Tables Requiring project_id Field

#### Core Content Tables
- **prompts**: `project_id` field added
  - Isolates prompt definitions per project
  - Maintains version history within project scope
  
- **executions**: `project_id` field added
  - Execution results isolated per project
  - Prevents cross-project execution access
  
- **files**: `project_id` field added
  - File uploads scoped to projects
  - Prevents file access across projects

#### Test Data Tables
- **test_data_groups**: `project_id` field added
  - Test data organization per project
  
- **test_data_items**: `project_id` field added
  - Individual test cases scoped to projects

#### Deployment Tables
- **deployments**: `project_id` field added
  - API deployments isolated per project
  - Prevents cross-project deployment access

#### Collaboration Tables
- **comments**: `project_id` field added
  - Comments on executions/prompts scoped to projects
  
- **execution_bundles**: `project_id` field added
  - Execution groupings isolated per project

#### API Access Tables
- **api_keys**: `project_id` field added
  - API keys scoped to specific projects
  - Enables project-specific API access control

### Tables Remaining Global (No project_id)

#### System Configuration
- **settings**: Remains global
  - LLM API keys shared across projects
  - Webhook destinations system-wide
  - System-level configuration

#### User Management
- **users**: Remains global
  - Users can access multiple projects
  - Project access controlled via separate mechanism
  - User profiles and authentication global

## Implementation Details

### Project Context Middleware

```typescript
// Extracts project_id from x-project-id header
// Validates project access for authenticated user
// Provides project-scoped model factory
export const projectContextMiddleware = (req, res, next) => {
  const projectId = req.headers['x-project-id'];
  req.projectContext = {
    projectId,
    models: new ProjectModelFactory(projectId)
  };
};
```

### Project Model Factory

```typescript
// Factory providing project-scoped model instances
export class ProjectModelFactory {
  constructor(private projectId: string) {}
  
  get prompt() { return new ProjectPromptModel(this.projectId); }
  get execution() { return new ProjectExecutionModel(this.projectId); }
  get file() { return new ProjectFileModel(this.projectId); }
  // ... other models
}
```

### Project-Scoped Base Model

```typescript
// Extends base Model to automatically inject project_id
export abstract class ProjectModel<T extends BaseDocument & { project_id: string }> extends Model<T> {
  constructor(protected projectId: string) {
    super();
  }
  
  // Auto-injects project_id on create
  // Auto-filters by project_id on all queries
}
```

## Database Indexes

### Required Indexes for Performance

```sql
-- Core content tables
CREATE INDEX idx_prompts_project_id ON prompts(JSON_EXTRACT(data, '$.project_id'));
CREATE INDEX idx_executions_project_id ON executions(JSON_EXTRACT(data, '$.project_id'));
CREATE INDEX idx_files_project_id ON files(JSON_EXTRACT(data, '$.project_id'));

-- Test data tables
CREATE INDEX idx_test_data_groups_project_id ON test_data_groups(JSON_EXTRACT(data, '$.project_id'));
CREATE INDEX idx_test_data_items_project_id ON test_data_items(JSON_EXTRACT(data, '$.project_id'));

-- Deployment tables
CREATE INDEX idx_deployments_project_id ON deployments(JSON_EXTRACT(data, '$.project_id'));

-- Collaboration tables
CREATE INDEX idx_comments_project_id ON comments(JSON_EXTRACT(data, '$.project_id'));
CREATE INDEX idx_execution_bundles_project_id ON execution_bundles(JSON_EXTRACT(data, '$.project_id'));

-- API access tables
CREATE INDEX idx_api_keys_project_id ON api_keys(JSON_EXTRACT(data, '$.project_id'));
```

## Migration Strategy

### Phase 1: Schema Updates
1. Add `project_id` field to all relevant table interfaces
2. Create database migration to add default project for existing data
3. Add required indexes for performance

### Phase 2: Model Layer Updates
1. Implement ProjectModel base class
2. Create project-scoped model classes
3. Implement ProjectModelFactory

### Phase 3: Middleware Integration
1. Create project context middleware
2. Update API handlers to use project context
3. Add project validation logic

### Phase 4: API Updates
1. Update all API endpoints to require x-project-id header
2. Update API definitions to reflect project scoping
3. Add project management endpoints

## Security Considerations

### Data Isolation Guarantees
- **Query-level isolation**: All queries automatically filtered by project_id
- **Creation isolation**: All new records automatically tagged with project_id
- **Header validation**: Project ID extracted from trusted header source
- **Access control**: User permissions validated per project

### Potential Security Risks
- **Missing project context**: Middleware must be applied to all protected routes
- **Direct model access**: Direct model imports bypassing project context must be prevented
- **Cross-project references**: Foreign key relationships must respect project boundaries

## Performance Implications

### Query Performance
- **Positive**: Smaller result sets due to project filtering
- **Positive**: More targeted indexes per project subset
- **Negative**: Additional WHERE clause on every query
- **Mitigation**: Proper indexing on project_id fields

### Storage Efficiency
- **Positive**: No duplicate schema per project
- **Positive**: Shared indexes and metadata
- **Negative**: Additional project_id storage per record
- **Overall**: Minimal storage overhead

## API Changes

### Header Requirements
All API requests must include:
```
x-project-id: <project-uuid>
```

### Handler Pattern Changes
```typescript
// Before
const prompts = await promptModel.findMany();

// After  
const prompts = await req.projectContext.models.prompt.findMany();
```

## Benefits

1. **Complete Data Isolation**: Impossible to accidentally access cross-project data
2. **Minimal Code Changes**: Existing business logic largely unchanged
3. **Performance**: Efficient querying with proper indexing
4. **Scalability**: Single database supports multiple projects
5. **Maintainability**: Single schema to maintain and evolve
6. **Analytics**: Cross-project analytics possible when needed

## Future Considerations

### Project Management
- Project creation/deletion endpoints
- User-project access control
- Project-level settings and configuration

### Advanced Features
- Project templates and cloning
- Cross-project data sharing mechanisms
- Project-level backup and restore
- Usage analytics and billing per project

---

**Implementation Date**: TBD  
**Status**: Planned  
**Priority**: High - Required for multi-tenant SaaS offering
