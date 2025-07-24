## Test Data

Test data represents the various inputs and scenarios you want to evaluate your prompts against. Rather than testing prompts one input at a time, Hypersigil encourages you to build comprehensive test suites that cover the range of situations your prompts will encounter in real-world usage.

### Test Data Organization

Test data is organized into groups, which serve as collections of related test cases. For example, you might have a group called "Customer Support Scenarios" containing various customer inquiries, complaints, and requests. Another group might focus on "Technical Documentation" with different types of technical content that need to be processed.

This organizational structure helps you maintain logical separation between different types of testing scenarios while making it easy to run comprehensive tests across entire categories of inputs. Groups can be used to represent different use cases, different data sources, or different stages of your testing process.

### Data Import and Management

The platform supports both manual test data creation and bulk import from files, recognizing that test data often exists in various formats across your organization. The import system is designed to be extensible, currently supporting Markdown files with the ability to add support for other formats as needed.

When importing data, the system intelligently processes file contents to create meaningful test cases. For Markdown files, each file becomes a separate test item with the filename serving as the item name and the file content as the test input. This approach makes it easy to convert existing documentation, examples, or datasets into structured test cases.

### Batch Testing Capabilities

Test data groups enable powerful batch testing scenarios where you can run a single prompt against multiple test cases simultaneously. This capability transforms testing from a one-at-a-time process into a comprehensive evaluation that can cover dozens or hundreds of scenarios in a single operation.

The batch testing system maintains the relationship between test data groups and the executions they generate, making it easy to analyze results across the entire test suite. This organizational structure supports both immediate analysis of batch results and long-term tracking of how prompt changes affect performance across different test scenarios.

