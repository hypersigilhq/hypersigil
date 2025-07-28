## Prompts

At the heart of Hypersigil lies the concept of prompts - these are the instructions or conversation starters you provide to AI systems. A prompt might be as simple as "Summarize this text" or as complex as a detailed persona with specific formatting requirements and behavioral guidelines. The platform treats prompts as living documents that can evolve over time through testing and refinement.

### Prompt Versioning and Evolution

Prompts in the system are versioned, meaning you can track how your instructions change over time and compare the performance of different versions. This versioning system becomes particularly valuable when you're iterating on prompt design, as you can always return to previous versions if new changes don't improve performance.

The platform supports dynamic prompts through template variables, allowing you to create flexible instructions that can be customized for different inputs. This templating system uses Mustache syntax, enabling you to create prompts that adapt to different contexts while maintaining consistent structure and tone.

### Multimodal Prompt Capabilities

Hypersigil supports multimodal prompts that can work with both text and file inputs. Prompts can be configured to accept file uploads, enabling powerful use cases such as:

- **Image Analysis**: Upload images for AI-powered visual analysis and description
- **Document Processing**: Analyze PDFs, text files, and other documents
- **Mixed Media**: Combine text instructions with visual or document context

When creating prompts, you can enable the "Accept File Upload" option, which allows users to attach files when scheduling executions. This feature works across all supported AI providers that have multimodal capabilities, automatically handling the technical details of file processing and provider-specific formatting.

The file upload system integrates seamlessly with the existing prompt templating system, allowing you to create sophisticated prompts that combine structured text instructions with dynamic file content.

### Prompt Testing and Calibration

The commenting system allows you to annotate specific parts of AI responses, creating a feedback loop that can inform prompt improvements. These comments become particularly powerful when combined with the calibration feature, which can analyze your feedback and suggest specific improvements to your prompts.

When you have gathered feedback through comments on execution results, the calibration system can process this information and generate suggestions for how to modify your prompts to address the issues you've identified. This creates a data-driven approach to prompt improvement that goes beyond trial and error.

The calibration system includes intelligent features such as:

- **AI-Generated Suggestions**: Automatic analysis of comments and execution results to propose prompt improvements
- **Summarization Options**: Choose whether to include execution result summaries in calibration analysis
- **Iterative Refinement**: Apply suggested changes and test them against your existing test data

### Prompt Preview and Compilation

Before running executions, you can preview how your prompts will appear after template variable substitution. This preview functionality uses the same Mustache templating engine that processes prompts during execution, ensuring that what you see in the preview matches exactly what will be sent to the AI provider.

The preview system supports both manual text input and test data compilation, allowing you to see how your prompts will behave with different types of input data before committing to full execution runs.
