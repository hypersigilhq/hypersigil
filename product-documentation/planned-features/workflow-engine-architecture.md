# Workflow Engine Architecture

## Overview

A comprehensive workflow engine that enables users to create complex, multi-step agentic flows by chaining prompt executions, applying conditional logic, and routing outputs between steps. This system builds upon the existing robust execution infrastructure to provide powerful orchestration capabilities.

## Current System Analysis

### Existing Infrastructure
- **Execution Model**: Individual prompt executions with status tracking (pending, running, completed, failed)
- **Execution Service**: Polling-based execution processor with concurrency control
- **Provider System**: Extensible AI provider architecture (Ollama, OpenAI, Claude)
- **Execution Bundles**: Basic grouping of executions for test data scenarios
- **Database Layer**: SQLite with JSON document storage and robust querying capabilities

### Integration Strategy
The workflow engine will act as a higher-level coordinator that creates and manages individual executions through the current system, leveraging existing infrastructure while adding orchestration capabilities.

## Core Architecture Components

### 1. Workflow Definition Model

**File**: `backend/src/models/workflow.ts`

```typescript
interface Workflow extends BaseDocument {
  name: string;
  description?: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  definition: WorkflowDefinition;
  created_by?: string;
  tags?: string[];
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
}

interface WorkflowEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  source_output: string;
  target_input: string;
  condition?: string; // Optional condition for conditional routing
}

interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default_value?: any;
  description?: string;
}

interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'event';
  config: Record<string, any>;
}
```

### 2. Workflow Execution Model

**File**: `backend/src/models/workflow-execution.ts`

```typescript
interface WorkflowExecution extends BaseDocument {
  workflow_id: string;
  workflow_version: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  current_node_id?: string;
  context: Record<string, any>; // Runtime variables and data
  input_data: Record<string, any>; // Initial input data
  output_data?: Record<string, any>; // Final output data
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  execution_trace: WorkflowExecutionStep[];
}

interface WorkflowExecutionStep {
  node_id: string;
  node_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  execution_id?: string; // Link to individual prompt execution
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
}
```

### 3. Node Types Architecture

**Base Node Interface**:
```typescript
interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: { x: number; y: number }; // For UI positioning
  config: NodeConfig;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  retry_policy?: RetryPolicy;
}

enum NodeType {
  PROMPT_EXECUTION = 'prompt_execution',
  CONDITION = 'condition',
  LOOP = 'loop',
  PARALLEL = 'parallel',
  MERGE = 'merge',
  DELAY = 'delay',
  WEBHOOK = 'webhook',
  DATA_TRANSFORM = 'data_transform',
  HUMAN_APPROVAL = 'human_approval',
  START = 'start',
  END = 'end'
}

interface NodeInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

interface NodeOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

interface RetryPolicy {
  max_attempts: number;
  delay_ms: number;
  backoff_multiplier: number;
  retry_on_errors: string[];
}
```

**Specific Node Configurations**:

1. **Prompt Execution Node**:
```typescript
interface PromptExecutionConfig extends NodeConfig {
  prompt_id: string;
  prompt_version?: number;
  provider_model: string; // "provider:model" format
  options?: ExecutionOptions;
  input_mapping: Record<string, string>; // Map workflow context to prompt inputs
  output_mapping: Record<string, string>; // Map prompt outputs to workflow context
}
```

2. **Condition Node**:
```typescript
interface ConditionConfig extends NodeConfig {
  condition: string; // JavaScript expression
  true_path: string; // Node ID for true condition
  false_path: string; // Node ID for false condition
}
```

3. **Loop Node**:
```typescript
interface LoopConfig extends NodeConfig {
  loop_type: 'for_each' | 'while' | 'count';
  array_source?: string; // Context variable name for for_each
  condition?: string; // Condition for while loop
  count?: number; // Count for count loop
  max_iterations: number; // Safety limit
}
```

4. **Parallel Node**:
```typescript
interface ParallelConfig extends NodeConfig {
  branches: ParallelBranch[];
  wait_for: 'all' | 'any' | 'count';
  required_count?: number; // For wait_for: 'count'
}

interface ParallelBranch {
  name: string;
  target_node_id: string;
  input_data: Record<string, any>;
}
```

### 4. Workflow Engine Service

**File**: `backend/src/services/workflow-engine.ts`

```typescript
class WorkflowEngine {
  private static instance: WorkflowEngine;
  private executionService: ExecutionService;
  private isInitialized: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  // Core execution methods
  async executeWorkflow(workflowId: string, inputData: Record<string, any>): Promise<WorkflowExecution>;
  async resumeWorkflow(executionId: string): Promise<void>;
  async cancelWorkflow(executionId: string): Promise<void>;
  async pauseWorkflow(executionId: string): Promise<void>;
  
  // Node execution
  private async executeNode(execution: WorkflowExecution, node: WorkflowNode): Promise<NodeExecutionResult>;
  private async executePromptNode(execution: WorkflowExecution, node: WorkflowNode): Promise<NodeExecutionResult>;
  private async executeConditionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<NodeExecutionResult>;
  private async executeLoopNode(execution: WorkflowExecution, node: WorkflowNode): Promise<NodeExecutionResult>;
  private async executeParallelNode(execution: WorkflowExecution, node: WorkflowNode): Promise<NodeExecutionResult>;
  
  // Flow control
  private async getNextNodes(currentNode: WorkflowNode, context: Record<string, any>): Promise<WorkflowNode[]>;
  private async updateExecutionContext(executionId: string, updates: Record<string, any>): Promise<void>;
  private async evaluateCondition(condition: string, context: Record<string, any>): Promise<boolean>;
  
  // Context and data management
  private async resolveInputData(node: WorkflowNode, context: Record<string, any>): Promise<Record<string, any>>;
  private async updateContextFromOutput(context: Record<string, any>, output: Record<string, any>, mapping: Record<string, string>): Promise<void>;
  
  // Error handling and retry
  private async handleNodeError(execution: WorkflowExecution, node: WorkflowNode, error: Error): Promise<boolean>;
  private async retryNode(execution: WorkflowExecution, node: WorkflowNode, attempt: number): Promise<NodeExecutionResult>;
}

interface NodeExecutionResult {
  status: 'completed' | 'failed' | 'pending';
  output_data?: Record<string, any>;
  error_message?: string;
  next_nodes?: string[];
}
```

### 5. Database Schema Extensions

**New Tables**:
```sql
-- Workflows table
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Workflow executions table
CREATE TABLE workflow_executions (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Workflow execution steps table
CREATE TABLE workflow_execution_steps (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Workflow templates table (for reusable workflows)
CREATE TABLE workflow_templates (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Existing Table Extensions**:
```sql
-- Add workflow context to existing executions
ALTER TABLE executions ADD COLUMN workflow_execution_id TEXT;
ALTER TABLE executions ADD COLUMN workflow_node_id TEXT;
```

### 6. API Layer

**File**: `backend/src/api/definitions/workflow.ts`

```typescript
// Workflow CRUD operations
export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  definition: workflowDefinitionSchema,
  tags: z.array(z.string()).optional()
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  definition: workflowDefinitionSchema.optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  tags: z.array(z.string()).optional()
});

// Workflow execution operations
export const executeWorkflowSchema = z.object({
  input_data: z.record(z.any()),
  variables: z.record(z.any()).optional()
});

export const workflowExecutionResponseSchema = z.object({
  id: z.string(),
  workflow_id: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'paused']),
  current_node_id: z.string().optional(),
  progress: z.object({
    completed_nodes: z.number(),
    total_nodes: z.number(),
    current_step: z.string().optional()
  }),
  started_at: z.date().optional(),
  completed_at: z.date().optional(),
  duration_ms: z.number().optional()
});
```

**New API Endpoints**:
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows with filtering
- `GET /api/workflows/:id` - Get workflow details
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/execute` - Execute workflow
- `GET /api/workflow-executions` - List workflow executions
- `GET /api/workflow-executions/:id` - Get execution details
- `POST /api/workflow-executions/:id/cancel` - Cancel execution
- `POST /api/workflow-executions/:id/pause` - Pause execution
- `POST /api/workflow-executions/:id/resume` - Resume execution
- `GET /api/workflow-executions/:id/logs` - Get execution trace
- `GET /api/workflow-templates` - Get workflow templates

### 7. Advanced Features

#### Scheduling & Triggers
- **Cron-based scheduling**: Execute workflows on schedule
- **Webhook triggers**: HTTP endpoints to trigger workflows
- **Event-based triggers**: React to execution completions, data changes
- **Manual triggers**: User-initiated workflow execution

#### Error Handling & Retry Logic
- **Node-level retry policies**: Configurable retry attempts with backoff
- **Workflow-level error handling**: Global error handlers and recovery strategies
- **Dead letter queues**: Failed workflows for manual intervention
- **Circuit breakers**: Prevent cascading failures

#### Monitoring & Observability
- **Execution metrics**: Success rates, duration, throughput
- **Performance monitoring**: Node execution times, bottleneck identification
- **Audit trails**: Complete execution history and changes
- **Real-time dashboards**: Live workflow execution monitoring

#### Data Management
- **Context variables**: Persistent data across workflow execution
- **Data transformations**: Built-in functions for data manipulation
- **External data sources**: Integration with APIs and databases
- **Data validation**: Schema validation for inputs and outputs

### 8. UI Components

#### Workflow Builder Interface
- **Drag-and-drop designer**: Visual workflow creation
- **Node library**: Pre-built node types with configuration panels
- **Connection management**: Visual edge creation and editing
- **Real-time validation**: Immediate feedback on workflow validity

#### Execution Visualization
- **Live execution tracking**: Real-time progress visualization
- **Execution history**: Historical workflow runs with detailed logs
- **Debug mode**: Step-by-step execution with breakpoints
- **Performance analytics**: Execution time analysis and optimization suggestions

#### Integration with Existing UI
- **Extended execution views**: Show workflow context in execution details
- **Workflow execution history**: New section in executions table
- **Quick workflow creation**: Templates and wizards for common patterns

### 9. Implementation Phases

#### Phase 1: Core Infrastructure (4-6 weeks)
- Workflow and WorkflowExecution models
- Basic workflow engine with sequential execution
- Essential node types (start, end, prompt_execution, condition)
- Basic API endpoints for CRUD operations

#### Phase 2: Advanced Node Types (3-4 weeks)
- Loop, parallel, and merge nodes
- Data transformation capabilities
- Enhanced error handling and retry logic
- Workflow execution monitoring

#### Phase 3: Triggers and Scheduling (2-3 weeks)
- Cron-based scheduling system
- Webhook trigger endpoints
- Event-based trigger system
- Manual execution improvements

#### Phase 4: UI Workflow Builder (6-8 weeks)
- Visual workflow designer
- Node configuration interfaces
- Real-time execution visualization
- Workflow templates and sharing

#### Phase 5: Advanced Features (4-6 weeks)
- Human approval nodes
- External integrations (webhooks, APIs)
- Advanced monitoring and analytics
- Performance optimization

#### Phase 6: Enterprise Features (3-4 weeks)
- User permissions and workflow sharing
- Workflow versioning and rollback
- Advanced scheduling options
- Workflow marketplace/templates

### 10. Technical Considerations

#### Performance
- **Concurrent execution**: Leverage existing execution service concurrency
- **Resource management**: Memory and CPU usage optimization
- **Scalability**: Design for horizontal scaling
- **Caching**: Workflow definition and execution state caching

#### Security
- **Access control**: User-based workflow permissions
- **Input validation**: Comprehensive input sanitization
- **Execution isolation**: Secure execution environments
- **Audit logging**: Complete security audit trails

#### Reliability
- **State persistence**: Durable workflow execution state
- **Recovery mechanisms**: Automatic recovery from failures
- **Backup and restore**: Workflow definition and execution backup
- **Health monitoring**: System health checks and alerting

### 11. Success Metrics

#### User Adoption
- Number of workflows created
- Workflow execution frequency
- User engagement with workflow builder
- Template usage and sharing

#### System Performance
- Workflow execution success rate
- Average execution time
- System resource utilization
- Error rates and recovery times

#### Business Value
- Automation of manual processes
- Reduction in execution setup time
- Improved prompt execution efficiency
- Enhanced user productivity

## Conclusion

This workflow engine architecture provides a comprehensive solution for creating complex, multi-step agentic flows while leveraging the existing robust execution infrastructure. The phased implementation approach ensures steady progress with immediate value delivery, while the modular design allows for future extensibility and customization.

The system will transform the current single-execution model into a powerful orchestration platform, enabling users to create sophisticated AI workflows that can handle complex business logic, conditional routing, and multi-step processing scenarios.
