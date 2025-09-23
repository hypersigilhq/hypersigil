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
- [done] Add more AI providers (Claude/Anthropic, OpenAI, Gemini, and DeepSeek providers implemented)
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
- [done] Integrate provider registry with settings model to use database-stored API keys instead of environment variables with dynamic refresh capability
- [done] Implement file upload support for AI providers (OpenAI, Anthropic, Ollama) with vision capabilities and multimodal interactions
- [done] Add options property to prompt model, API definitions, and handlers to support prompt configuration settings
- [done] Implement accept file upload option setting in PromptsTable.vue with switch component for prompt configuration
- [done] Create new file model with basic metadata properties and base64 encoded data storage for upload data management
- [done] Implement Files UI route with table view, debounced search, upload modal, and file management functionality
- [done] Extract upload dialog to separate component and implement multiple file upload with status tracking
- [done] Integrate file selection in ScheduleExecutionDialog for prompts with acceptFileUpload option enabled
- [done] Add fileId validation and storage in execution model for file upload support
- [done] Implement file upload integration in execution worker with provider support validation and file fetching
- [done] Implement file viewer dialog for PDF and image files with full-screen viewing experience
- [done] Implement tag functionality for file uploads with batch tagging support and intuitive badge-based UI
- [done] Implement file download endpoint with base64 decoding and binary streaming with appropriate headers
- [done] 28-07-25 17:37 Update documentation to reflect all implemented features from July 25th onwards including settings management, file upload system, onboarding, and multimodal capabilities
- [done] 28-07-28 21:44 Implement deployment model with CRUD endpoints and run functionality for prompt execution management
- [done] 28-07-28 21:57 Add deployment options (temperature, topP, topK) to deployment model and API definitions with execution integration
- [done] 28-07-28 22:12 Build deployment CRUD interface with table view, dialog forms, and full integration with existing UI patterns
- [done] 29-07-25 18:34 Implement clipboard service with HTTP/HTTPS fallback support for CopyToClipboard component functionality across all deployment environments

- [done] 15-09-25 17:06 Implement LLM API key activation/deactivation feature with toggle switches in settings UI and backend support for active/inactive key management
- [done] 23-09-25 23:00 Implement service API key settings support for VoyageAI provider with full CRUD operations, UI components, and encrypted storage



- [todo] in prompt selector preselect latest version
- [todo] add GET /deployment/run/:id with less data than GET /execution
- [done] 05-08-25 00:17 webhooks for finished Executions (define in the settings webhook targets, in the deployment pick for which targets to deliver the webhooks) - webhook destinations management UI implemented
- [done] 05-08-25 00:41 Add webhook column to DeploymentsTable.vue showing webhook destination names by ID
- [done] 05-08-25 14:25 Implement jobs listing view with filtering and deeply linked job details dialog for background job monitoring
- [done] 05-08-25 21:33 Add webhook testing functionality to CreateWebhookDestinationDialog with trigger endpoint integration
- [done] 05-08-25 21:50 Implement per-job-type concurrency system with type-safe configuration, reserved capacity model, and priority-based scheduling for optimal webhook delivery performance
- [todo] adding comments to prompts
- [todo] /stats/all doesnt work when ollama is not configured
- [todo] empty userInput raises error, for example when sending a file for OC
- [todo] deployment GET /info so that it returns info about promptId. (then I can run GET {promptId} download input/output schema and generate typescript types)
- [todo] add more tracing options so apart from traceId add a possibility to send metadata object along with the execution/deployment. Up to 1kb of data serialized
- [todo] deployment webhook should contain traceId as well as metadata
- [todo] a failed execution because of 5xx error from an LLM provided should be repeated - it should be handled in deployment options - retry up to X times
- [todo] add edit button in view prompt dialog
- [todo] in execution view details add a button/toggle to show compiled prompt
- [done] Add enum support for string types with descriptions in JSON schema builder
- [todo] e2e contract/functional testing with hurl https://github.com/Orange-OpenSource/hurl?tab=readme-ov-file

# Big features
- [todo] pricing $ implementation
- [todo] dashboard
- [done] 25-09-08 Dashboard date range picker with conditional hourly/daily charts (Today, This week, Last 7 days, Last 30 days presets) - Fixed same-day filtering issue, extended charts to always show full spans
- [done] 25-09-08 14:09 Grouped stacked bar chart with input/output token distinction, grouping switch, and advanced controls - Implemented comprehensive dashboard charts with three grouping modes (None, Provider, Provider+Model), token type toggle (input/output vs total), and provider filter for complete chart customization
- [done] 25-09-08 14:43 Implement gap-filling for daily/hourly charts to ensure complete time spans with zero values - Added fillDailyGaps and fillHourlyGaps functions to DashboardView.vue that generate complete date/hour ranges and fill missing periods with zero token usage for consistent chart visualization
- [todo] reports tab: usage of prompt/deployment/model/api-key
- [todo] projects
