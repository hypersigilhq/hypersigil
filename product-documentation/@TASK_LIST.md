# Task List

## Backend Development
- [done] Implement TypeScript backend API server using ts-typed-api package and ExpressJS
- [done] Set up project structure with proper TypeScript configuration
- [done] Configure Express server with middleware
- [done] Implement API endpoints with type safety
- [done] Add error handling and validation
- [done] Set up development and build scripts

## Prompt Execution Feature
- [done] Design and implement execution data model with proper status tracking
- [done] Create extensible AI provider system with Ollama as first implementation
- [done] Build asynchronous job processing system with retry mechanisms
- [done] Implement execution API endpoints with real-time status updates
- [done] Add execution monitoring and logging capabilities
- [done] Create provider health checking and failover mechanisms
- [done] Simplify execution service by replacing in-memory queue with database polling
- [done] Implement prompt data retrieval in execution API endpoints
- [done] Implement prompt versioning system with automatic version creation and version-specific execution

## Test Data Management Feature
- [done] Design and implement test data group and test data item API definitions
- [done] Create comprehensive type-safe API schemas for test data management
- [done] Implement batch execution functionality for test data groups
- [done] Add bulk operations support for test data items
- [done] Integrate test data system with existing execution infrastructure

## Frontend Features
- [done] Connect frontend to backend API - Executions view implemented
- [done] Add schedule execution action to prompts table with execution creation dialog
- [done] Implement test data management UI interface with table views and modal dialogs
- [done] Implement extensible file import feature for test data items with markdown support
- [done] Implement toast notification service and modal confirmation dialog system

## Future Tasks
- [done] Add authentication and authorization
- [done] Implement database integration
- [done] Add API documentation
- [todo] Set up testing framework
- [done] Add more AI providers (Claude/Anthropic and OpenAI providers implemented)
- [done] Implement execution bundles list view with macOS Finder-style interface
- [todo] Implement streaming responses for real-time execution updates
- [todo] Add execution result caching and optimization
- [todo] Create execution templates and presets
- [todo] Add execution scheduling and batch processing
- [done] Fix form component structure in authentication views
- [done] Docker build system with single container deployment using nginx and supervisord
- [done] Docker push script for publishing images to Docker Hub registry

- [done] Implement prompt compilation with test data using Mustache templating engine
- [done] Add prompt compilation UI to test data item dialog for JSON mode groups
- [done] Improve test data item dialog with two-column layout and automatic prompt compilation

- [done] Implement user management with invitation-based registration, role-based access control, and profile management
- [done] Implement settings tabbed view with Users table displaying name, email, role, status, and last login columns
- [done] Implement user invitation system with dialog interface and copyable invitation links
- [done] Token cost settings
- [done] API keys settings
- [done] Settings API handlers with CRUD operations for all setting types
- [done] Refactor CreateApiKeyDialog to use dynamic permissions from API definitions
- [todo] Execution user status, rating
- [todo] Prompt user status, rating
- [todo] Notifications?
- [done] Add comments section to ViewPromptDialog with checkboxes for comment selection
- [done] Implement prompt adjustment service that generates adjustment prompts based on comments and execution results
- [done] Implement prompt calibration UI with "Calibrate prompt" button and dedicated dialog for displaying adjustment suggestions
- [done] Implement invitation setup view for password creation by invited users
- [done] Add prompt preview endpoint for compiling prompts with user input using Mustache templating
- [done] Implement per-provider parallelism in execution worker to replace global concurrency limit with provider-specific limits
- [done] Implement General settings tab with LLM API key management for adding and removing provider API keys
