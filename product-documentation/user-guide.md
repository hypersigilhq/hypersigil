# Hypersigil User Guide

## Understanding Hypersigil

Hypersigil is a comprehensive testing platform designed to help you develop, refine, and validate AI prompts before deploying them in production environments. Think of it as a laboratory where you can experiment with different ways of communicating with AI systems, measure their effectiveness, and continuously improve your results.

The platform operates on a simple but powerful concept: instead of guessing whether your AI prompts will work well, you can systematically test them against various inputs and scenarios. This approach transforms prompt engineering from an art into a more scientific process, where decisions are based on measurable results rather than intuition.

## Getting Started with Your Account

When you first encounter Hypersigil, the system recognizes that no users exist yet and automatically guides you through creating the first administrator account. This initial setup establishes the foundation for your organization's prompt testing environment. Once this first account is created, the system transforms into a collaborative platform where multiple team members can work together on prompt development and testing.

The authentication system is designed around invitation-based access, meaning that after the initial administrator is established, all subsequent users join through secure invitation links. This approach ensures that access to your prompt testing environment remains controlled while making it easy to onboard new team members.

## The Core Concept: Prompts

At the heart of Hypersigil lies the concept of prompts - these are the instructions or conversation starters you provide to AI systems. A prompt might be as simple as "Summarize this text" or as complex as a detailed persona with specific formatting requirements and behavioral guidelines. The platform treats prompts as living documents that can evolve over time through testing and refinement.

Prompts in the system are versioned, meaning you can track how your instructions change over time and compare the performance of different versions. This versioning system becomes particularly valuable when you're iterating on prompt design, as you can always return to previous versions if new changes don't improve performance.

The platform supports dynamic prompts through template variables, allowing you to create flexible instructions that can be customized for different inputs. This templating system uses Mustache syntax, enabling you to create prompts that adapt to different contexts while maintaining consistent structure and tone.

## Understanding Test Data

Test data represents the various inputs and scenarios you want to evaluate your prompts against. Rather than testing prompts one input at a time, Hypersigil encourages you to build comprehensive test suites that cover the range of situations your prompts will encounter in real-world usage.

Test data is organized into groups, which serve as collections of related test cases. For example, you might have a group called "Customer Support Scenarios" containing various customer inquiries, complaints, and requests. Another group might focus on "Technical Documentation" with different types of technical content that need to be processed.

The platform supports both manual test data creation and bulk import from files, recognizing that test data often exists in various formats across your organization. The import system is designed to be extensible, currently supporting Markdown files with the ability to add support for other formats as needed.

## The Execution System

Executions represent the actual testing process where your prompts are run against test data using various AI providers. When you create an execution, you're essentially asking the system to take a specific prompt, apply it to particular input data, and capture the AI's response along with metadata about the interaction.

The execution system operates asynchronously, meaning you can queue up multiple tests and let them run in the background while you continue working on other tasks. This design becomes particularly valuable when testing prompts against large datasets or when using AI providers that may have rate limits or longer response times.

Each execution captures comprehensive information including the exact prompt used, the input data, the AI provider and model, the response generated, timing information, and token usage. This detailed logging enables you to analyze not just what the AI produced, but also the cost and performance characteristics of different approaches.

## AI Provider Integration

Hypersigil integrates with multiple AI providers including OpenAI, Anthropic's Claude, and local Ollama installations. This multi-provider approach allows you to compare how different AI systems respond to the same prompts, helping you choose the most appropriate model for your specific use case.

The provider system is designed with flexibility in mind, supporting different execution parameters for each provider. Temperature controls how creative or deterministic the AI's responses are, while token limits help manage costs and response length. The platform automatically handles the technical details of communicating with different providers while presenting a unified interface for testing.

Token usage tracking provides visibility into the cost implications of your prompts, helping you optimize for both quality and efficiency. This information becomes crucial when scaling prompt-based applications, as small improvements in prompt efficiency can lead to significant cost savings over time.

## Analyzing Results

The execution results system provides multiple ways to examine and understand how your prompts perform. Individual execution details show the complete conversation flow, including the original prompt, the input data, and the AI's response. This granular view helps you understand exactly what happened during each test.

For batch testing scenarios, the execution bundles view organizes related executions together, making it easier to analyze patterns across multiple test cases. This organizational structure becomes particularly valuable when you're testing a single prompt against dozens or hundreds of different inputs.

The commenting system allows you to annotate specific parts of AI responses, creating a feedback loop that can inform prompt improvements. These comments become particularly powerful when combined with the calibration feature, which can analyze your feedback and suggest specific improvements to your prompts.

## Collaborative Features

User management in Hypersigil is built around three distinct roles that reflect different levels of involvement in the prompt development process. Administrators have full control over the system and can manage users and settings. Regular users can create and test prompts while viewers can examine results and provide feedback without making changes.

The invitation system ensures that bringing new team members into your prompt testing environment is both secure and straightforward. When you invite someone, they receive a secure link that allows them to set their own password and immediately begin participating in your prompt development process.

API keys provide a way to integrate Hypersigil with other systems in your organization, enabling automated testing workflows or integration with existing development processes. These keys are scoped to specific permissions, ensuring that external integrations only have access to the functionality they need.

## Data Export and Integration

The platform recognizes that prompt testing is often part of a larger development and analysis workflow. CSV export functionality allows you to extract execution data for analysis in spreadsheet applications or data analysis tools. This export capability ensures that your testing data can feed into broader reporting and decision-making processes.

The API access system enables programmatic interaction with Hypersigil, supporting scenarios where you want to automate prompt testing as part of continuous integration pipelines or integrate prompt performance data with other business intelligence systems.

## Understanding the Testing Workflow

The typical workflow in Hypersigil follows a cycle of creation, testing, analysis, and refinement. You begin by creating prompts that encode your understanding of how to communicate effectively with AI systems. These prompts are then tested against representative data to understand their performance characteristics.

The analysis phase involves examining execution results, identifying patterns in AI responses, and understanding where prompts succeed or fail. The commenting and calibration features support this analysis by helping you capture insights and translate them into specific prompt improvements.

This cycle repeats as you refine your prompts based on testing results, creating an iterative improvement process that leads to more effective AI interactions over time. The versioning system ensures you can track this evolution and understand how changes impact performance.

## System Architecture Concepts

Hypersigil is designed as a comprehensive platform that handles the complexity of multi-provider AI testing while presenting a clean, intuitive interface. The system manages the technical details of communicating with different AI providers, handling rate limits, managing concurrent executions, and ensuring reliable delivery of results.

The execution queue system ensures that your tests run efficiently regardless of provider limitations or system load. Executions are processed in the background with appropriate concurrency limits for each provider, maximizing throughput while respecting API constraints.

Data persistence ensures that all your prompts, test data, and execution results are safely stored and easily accessible. The system maintains complete audit trails of all testing activity, supporting both immediate analysis and long-term trend identification.

This architecture enables Hypersigil to scale from individual experimentation to team-based prompt development workflows, supporting everything from quick prototype testing to comprehensive validation of production-ready prompt systems.
