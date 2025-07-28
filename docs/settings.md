## Settings

The settings system in Hypersigil encompasses user management, system configuration, and integration capabilities that support both individual use and team collaboration.

### General Settings and LLM API Key Management

The General settings tab provides centralized management of LLM API keys for different AI providers. This database-driven approach allows you to securely store and manage API keys for OpenAI, Anthropic, and Ollama providers without relying on environment variables.

Key features of the LLM API key management system include:

- **Secure Storage**: API keys are stored encrypted in the database
- **Dynamic Provider Configuration**: Providers are automatically enabled/disabled based on available API keys
- **Runtime Updates**: API key changes take effect immediately without server restart
- **Provider-Specific Settings**: Each provider can have its own configuration parameters

The system only displays the first and last four characters of API keys in the interface, ensuring that sensitive credentials remain protected while still allowing administrators to identify which keys are configured.

### User Management and Collaboration

User management in Hypersigil is built around three distinct roles that reflect different levels of involvement in the prompt development process. Administrators have full control over the system and can manage users and settings. Regular users can create and test prompts while viewers can examine results and provide feedback without making changes.

The invitation system ensures that bringing new team members into your prompt testing environment is both secure and straightforward. When you invite someone, they receive a secure link that allows them to set their own password and immediately begin participating in your prompt development process.

This role-based approach enables organizations to maintain appropriate access controls while fostering collaboration between team members with different responsibilities in the prompt development process.

### API Access and Integration

API keys provide a way to integrate Hypersigil with other systems in your organization, enabling automated testing workflows or integration with existing development processes. These keys are scoped to specific permissions, ensuring that external integrations only have access to the functionality they need.

The API access system enables programmatic interaction with Hypersigil, supporting scenarios where you want to automate prompt testing as part of continuous integration pipelines or integrate prompt performance data with other business intelligence systems.
