# Hypersigil Documentation

Welcome to Hypersigil, a comprehensive testing platform designed to help you develop, refine, and validate AI prompts before deploying them in production environments.

## What is Hypersigil?

Hypersigil transforms prompt engineering from an art into a scientific process by providing systematic testing capabilities for AI prompts. Instead of guessing whether your prompts will work effectively, you can test them against various inputs and scenarios, making decisions based on measurable results rather than intuition.

## Key Features

### 🎯 **Prompt Development & Testing**
- Create and version your AI prompts with template variable support
- Test prompts against multiple AI providers (OpenAI, Anthropic Claude, Ollama)
- Track performance metrics and token usage across different models

### 📊 **Comprehensive Test Data Management**
- Organize test cases into logical groups
- Import test data from various file formats
- Run batch executions across entire test suites

### 🔄 **Execution Management**
- Asynchronous processing with real-time status updates
- Provider-specific concurrency limits and rate limiting
- Detailed execution history and result analysis

### 💬 **Collaborative Features**
- Comment system for execution result analysis
- Prompt calibration based on feedback
- Team collaboration with role-based access control

### ⚙️ **Enterprise Ready**
- User management with invitation-based access
- API key management for external integrations
- Comprehensive audit trails and data export

## Getting Started

1. **[Introduction](introduction.md)** - Learn about the platform architecture and workflow
2. **[Prompts](prompts.md)** - Understand prompt creation, versioning, and templating
3. **[Executions](executions.md)** - Explore the testing and execution system
4. **[Test Data](test-data.md)** - Manage your test datasets effectively
5. **[Settings](settings.md)** - Configure users, API access, and system settings

## Quick Start Guide

### First Time Setup
When you first access Hypersigil, the system will guide you through creating the initial administrator account. This establishes the foundation for your organization's prompt testing environment.

### Basic Workflow
1. **Create Prompts** - Define your AI instructions with optional template variables
2. **Prepare Test Data** - Import or create test cases organized in groups
3. **Run Executions** - Test your prompts against your data using various AI providers
4. **Analyze Results** - Review outputs, add comments, and identify improvement opportunities
5. **Iterate & Improve** - Use the calibration system to refine your prompts based on results

## Architecture Overview

Hypersigil is built with a modern, scalable architecture:

- **Backend**: TypeScript/Node.js with Express and SQLite
- **Frontend**: Vue.js 3 with TypeScript and Tailwind CSS
- **API**: Type-safe REST API with comprehensive validation
- **Providers**: Extensible AI provider system supporting multiple services

## Support & Contributing

- **Repository**: [GitHub](https://github.com/hypersigilhq/hypersigil)
- **Issues**: Report bugs and request features on GitHub
- **Documentation**: This site is built with MkDocs and Material theme

---

Ready to start testing your AI prompts systematically? Begin with the [Introduction](introduction.md) to understand the core concepts and workflow.
