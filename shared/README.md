# @prompt-bench/shared

This is a shared TypeScript module containing API definitions and types used across the prompt-bench project.

## Structure

- `execution-definitions.ts` - API definitions for execution-related endpoints
- `prompt-definitions.ts` - API definitions for prompt-related endpoints
- `index.ts` - Main export file that re-exports all definitions

## Usage

This module is used as a local dependency in the backend:

```typescript
import { ExecutionApiDefinition, PromptApiDefinition } from '@prompt-bench/shared';
```

## Development

To build the module:

```bash
npm run build
```

To watch for changes during development:

```bash
npm run dev
```

## Dependencies

- `ts-typed-api` - For API type definitions
- `zod` - For schema validation (peer dependency)
