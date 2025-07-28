## Executions

Executions represent the actual testing process where your prompts are run against test data using various AI providers. When you create an execution, you're essentially asking the system to take a specific prompt, apply it to particular input data, and capture the AI's response along with metadata about the interaction.

### Asynchronous Processing

The execution system operates asynchronously, meaning you can queue up multiple tests and let them run in the background while you continue working on other tasks. This design becomes particularly valuable when testing prompts against large datasets or when using AI providers that may have rate limits or longer response times.

Each execution captures comprehensive information including the exact prompt used, the input data, the AI provider and model, the response generated, timing information, and token usage. This detailed logging enables you to analyze not just what the AI produced, but also the cost and performance characteristics of different approaches.

### AI Provider Integration

Hypersigil integrates with multiple AI providers including OpenAI, Anthropic's Claude, and local Ollama installations. This multi-provider approach allows you to compare how different AI systems respond to the same prompts, helping you choose the most appropriate model for your specific use case.

The provider system is designed with flexibility in mind, supporting different execution parameters for each provider. Temperature controls how creative or deterministic the AI's responses are, while token limits help manage costs and response length. The platform automatically handles the technical details of communicating with different providers while presenting a unified interface for testing.

Token usage tracking provides visibility into the cost implications of your prompts, helping you optimize for both quality and efficiency. This information becomes crucial when scaling prompt-based applications, as small improvements in prompt efficiency can lead to significant cost savings over time.

### Analyzing Execution Results

The execution results system provides multiple ways to examine and understand how your prompts perform. Individual execution details show the complete conversation flow, including the original prompt, the input data, and the AI's response. This granular view helps you understand exactly what happened during each test.

For batch testing scenarios, the execution bundles view organizes related executions together, making it easier to analyze patterns across multiple test cases. This organizational structure becomes particularly valuable when you're testing a single prompt against dozens or hundreds of different inputs. The bundles interface provides a macOS Finder-style experience with resizable columns and keyboard navigation for efficient result analysis.

The platform provides comprehensive status tracking for executions, with visual indicators showing whether tests are pending, running, completed successfully, or have failed. This real-time feedback helps you understand the progress of your testing campaigns and quickly identify any issues that need attention.

### Advanced Execution Features

#### Multimodal Execution Support
Executions can include file attachments when prompts are configured to accept file uploads. This enables sophisticated testing scenarios where you can evaluate how your prompts perform with different types of visual or document inputs. The system automatically handles file processing and provider-specific formatting for images, PDFs, and other supported file types.

#### Execution Duration and Performance Tracking
Each execution captures detailed timing information, allowing you to analyze not just the quality of AI responses but also their performance characteristics. This data helps you optimize prompts for both accuracy and efficiency, particularly important when scaling to production environments.

#### Token Usage and Cost Analysis
Comprehensive token usage tracking provides visibility into the cost implications of different prompts and providers. The system tracks both input and output tokens, helping you understand the full cost structure of your prompt testing and optimize for budget efficiency.

#### Per-Provider Parallelism
The execution system implements intelligent concurrency management with per-provider parallelism limits. This ensures optimal throughput while respecting rate limits and avoiding provider-specific bottlenecks. Different providers can run executions simultaneously at their optimal concurrency levels.

#### Execution Result Validation
The platform includes robust validation for execution results, ensuring data integrity and providing clear feedback when executions encounter issues. This validation system helps maintain the reliability of your testing data and provides actionable information for troubleshooting.

### Data Export and System Integration

The platform recognizes that prompt testing is often part of a larger development and analysis workflow. CSV export functionality allows you to extract execution data for analysis in spreadsheet applications or data analysis tools. This export capability ensures that your testing data can feed into broader reporting and decision-making processes.

The system maintains comprehensive audit trails of all testing activity, supporting both immediate analysis and long-term trend identification. This data persistence ensures that your testing history remains available for analysis and comparison as your prompts and testing practices evolve over time.
