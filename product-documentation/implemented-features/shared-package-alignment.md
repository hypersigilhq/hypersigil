# Shared Package Alignment Solution

## Problem
The `@prompt-bench/shared` package uses a local file dependency (`"file:../shared"`) in backend/package.json. When changes are made to the shared package, they don't automatically reflect in the backend because:

1. The shared package needs to be built (TypeScript compilation)
2. The backend's node_modules needs to be updated with the new build
3. npm doesn't automatically detect changes in local file dependencies

## Better Solutions

### Option 1: NPM Workspaces (Recommended)
Convert the project to use npm workspaces for automatic dependency management:

**Create root package.json:**
```json
{
  "name": "prompt-bench",
  "private": true,
  "workspaces": [
    "shared",
    "backend", 
    "ui"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspaces"
  }
}
```

**Benefits:**
- Automatic dependency linking
- Shared node_modules (reduces disk space)
- Built-in dependency management
- No manual sync needed

### Option 2: TypeScript Project References
Use TypeScript's project references for direct source compilation:

**In backend/tsconfig.json:**
```json
{
  "references": [
    { "path": "../shared" }
  ]
}
```

**In shared/tsconfig.json:**
```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true
  }
}
```

**Benefits:**
- Direct TypeScript compilation
- No build step needed for shared package
- Automatic type checking across projects

### Option 3: Symlink with Watch Scripts
Enhanced version of current approach with better automation:

**In shared/package.json:**
```json
{
  "scripts": {
    "dev": "tsc --watch",
    "sync": "npm run build && npm pack && cd ../backend && npm install ../shared/prompt-bench-shared-*.tgz"
  }
}
```

### Option 4: Direct Source Import (Simplest)
Import directly from TypeScript source files:

**In backend files:**
```typescript
import { ExecutionDefinition } from '../../shared/execution-definitions';
```

**Benefits:**
- No build step needed
- Immediate changes reflection
- Simplest setup

## Implementation Status
- ✅ Identified the alignment issue
- 🔄 Ready to implement automated scripts
- ⏳ Pending: Workspace migration consideration
