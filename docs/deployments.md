## Deployments

Deployments in Hypersigil represent pre-configured execution endpoints that combine a prompt, AI provider, and model into a reusable unit with a unique name. Think of deployments as "production-ready" versions of your prompts that can be executed consistently without needing to specify configuration details each time.

### Understanding Deployments

A deployment encapsulates all the necessary configuration for running a prompt:

- **Prompt**: The specific prompt template to execute
- **Provider**: The AI service (OpenAI, Anthropic, Ollama)
- **Model**: The specific model within that provider
- **Options**: Execution parameters like temperature, topP, and topK
- **Name**: A unique slug-based identifier for easy reference

This approach eliminates the need to repeatedly specify these parameters when running executions, creating a more streamlined and error-resistant workflow for production use cases.

### Deployment Naming and Access

Deployments use slug-based naming conventions, meaning names must contain only lowercase letters, numbers, hyphens, and underscores. This naming system enables both programmatic access and human-readable URLs. For example, a deployment named `customer-support-gpt4` can be accessed via API using either its unique ID or its friendly name.

The dual access pattern supports different use cases:
- **ID-based access**: For internal system operations and database relationships
- **Name-based access**: For external integrations and human-readable API endpoints

### Creating and Managing Deployments

#### Deployment Configuration

When creating a deployment, you specify:

1. **Name**: A unique slug identifier (immutable after creation)
2. **Prompt Selection**: Choose from your existing prompts
3. **Provider Configuration**: Select the AI provider and specific model
4. **Execution Options** (optional):
   - **Temperature** (0.0 - 1.0): Controls response creativity and randomness
   - **Top P** (0.0 - 1.0): Nucleus sampling parameter for response diversity
   - **Top K** (≥ 1): Limits vocabulary selection for more focused responses

#### Name Immutability

Once created, deployment names cannot be changed. This design decision ensures consistency for external integrations and API consumers who may reference deployments by name. If you need a different name, you must create a new deployment with the desired configuration.

#### Dynamic Model Loading

The deployment interface dynamically loads available models based on your selected provider. This ensures you can only create deployments with valid provider-model combinations, preventing runtime errors from invalid configurations.

### Deployment Execution

#### Running Deployments

Deployments can be executed through two primary methods:

1. **Name-based execution**: `POST /api/v1/deployments/{name}/run`

The method accepts execution parameters:
- **User Input**: The text or data to process
- **Execution Options**: Override deployment defaults if needed
- **Trace ID**: For execution tracking and debugging
- **File ID**: For multimodal prompts requiring file attachments

#### Execution Integration

When you run a deployment, the system:

1. Retrieves the deployment configuration
2. Validates the provider-model combination
3. Creates an execution using the existing execution service
4. Applies deployment options as defaults (can be overridden)
5. Returns execution IDs for tracking progress

This integration maintains compatibility with the existing execution workflow while providing a simplified interface for common use cases.

### API Access and Permissions

#### Permission System

Deployment operations integrate with the API key permission system:
- **deployments:run**: Required to execute deployments
- Standard CRUD permissions apply for management operations

This granular permission system allows you to create API keys specifically for deployment execution without granting broader system access.

#### Provider Validation

The system validates provider-model combinations at creation time using the provider registry. This validation ensures that deployments remain executable and prevents the creation of configurations that would fail at runtime.

### Deployment Management Interface

#### Deployments Table

The deployments interface provides comprehensive management capabilities:

- **Search and Filtering**: Full-text search across deployment properties
- **Sortable Columns**: Sort by name, provider, model, or timestamps
- **Pagination**: Handle large numbers of deployments efficiently
- **Batch Operations**: Future support for bulk management actions

#### API Simplification

Deployments reduce API complexity for common execution patterns. Instead of specifying prompt ID, provider, model, and options with each execution request, clients can simply reference a deployment name and provide user input.

#### Configuration Management

Deployments centralize execution configuration management, making it easier to:
- Update provider or model choices across multiple integrations
- Maintain consistent execution parameters
- Track configuration changes over time

#### Production Readiness

The deployment system provides a production-ready abstraction layer that:
- Validates configurations before execution
- Provides stable, named endpoints for external systems
- Maintains execution history tied to specific configurations
- Supports gradual rollout of prompt changes