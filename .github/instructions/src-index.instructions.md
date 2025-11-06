---
applyTo: "src/index.ts"
---

Purpose
- Define the public API surface of the library/package
- Act as the single entry point for external consumers
- Expose all exports from modules using `export *` pattern—no curation or hiding
- Provide developers access to all types and tools they need for customization
- Keep the barrel file clean with no logic or side effects

Philosophy
- **Do not curate or hide internals** - use `export * from './module.js'` to expose everything
- **Developers need full access** to all types and tools for custom use cases
- **There's nothing to hide** - the library is meant for extensibility and customization
- **Simplify downstream usage** - consumers can import anything they need without artificial restrictions

When to create/use
- **Always present** in libraries/packages to expose the public surface
- **Update whenever modules are added/removed** - keep in sync with src/ structure
- This file determines what external consumers can import from your package

When to update
- When adding a new module to `src/`
- When removing a module from `src/`
- Whenever you want to expose additional functionality

Required structure/exports
- **Use `export *` pattern** - expose all exports from each module
- **Named exports only** - never use default exports in barrel files
- **No logic or computations** - pure re-exports only
- **Keep ordering consistent** - alphabetically or by logical grouping
- **No side effects** at module scope

Allowed imports and ESM rules
- **Import from local leaf modules** using relative paths that include the `.js` suffix
- **No default exports** - use `export * from './module.js'`
- **No CommonJS patterns** - pure ESM only
- **Do not import Node-only modules** here - keep the barrel environment-agnostic
- **Separate type and value exports** for clarity

Patterns to prefer

### 1. Export everything with export * (PREFERRED)
```ts
// Export all types
export type * from './types.js'

// Export all constants
export * from './constants.js'

// Export all helpers
export * from './helpers.js'

// Export all module functionality
export * from './user.js'
export * from './auth.js'
export * from './parser.js'
```

### 2. Organizing with comments for clarity
```ts
// Core infrastructure
export type * from './types.js'
export * from './constants.js'
export * from './helpers.js'

// Feature modules
export * from './user.js'
export * from './auth.js'
export * from './session.js'

// Utilities
export * from './parser.js'
export * from './validator.js'
```

### 3. Separating type and value exports (optional, for tree-shaking)
```ts
// Types (can use export type for clarity, but export * also works)
export type * from './types.js'

// Values (functions, constants, classes)
export * from './constants.js'
export * from './helpers.js'
export * from './user.js'
```

### 4. Alphabetical ordering for discoverability
```ts
export type * from './types.js'
export * from './constants.js'
export * from './helpers.js'
export * from './parser.js'
export * from './auth.js'
export * from './user.js'
export * from './validator.js'
```

Anti-patterns to avoid

### ❌ Curating/hiding exports (DON'T DO THIS)
```ts
// BAD - selective exports hide useful functionality
export { createUser, deleteUser } from './user.js'
// What if downstream needs updateUser or internal helpers?

// GOOD - expose everything
export * from './user.js'
```

### ❌ Logic or computations in barrel
```ts
// BAD - barrel should have no logic
export const computed = calculateValue()
export function helperHere(): void {
  // logic
}

// GOOD - only re-exports
export * from './compute.js'
export * from './helpers.js'
```

### ❌ Side effects at import time
```ts
// BAD - side effects
console.log('Initializing library...')
setupGlobalState()

// BAD - environment reads
export const config = {
  apiKey: process.env.API_KEY
}

// GOOD - pure re-exports only
export * from './config.js'
```

### ❌ Default exports
```ts
// BAD
export { default as myFunction } from './module.js'

// GOOD
export * from './module.js'
```

### ❌ Importing Node-only modules
```ts
// BAD - makes barrel Node-only
import { readFileSync } from 'node:fs'

// GOOD - keep barrel platform-agnostic
export * from './config.js' // config.ts can use fs if needed
```

Why export * instead of selective exports?

1. **Full access for customization** - developers can use any tool they need
2. **No artificial restrictions** - don't second-guess what consumers need
3. **Easier maintenance** - no need to update barrel when adding exports to modules
4. **Better discoverability** - consumers can explore all available functionality
5. **Future-proof** - new exports in modules automatically available
6. **Simpler diffs** - adding a module is one line, not many
7. **TypeScript handles unused exports** - tree-shaking removes what's not imported

File organization patterns

### Small library (< 5 modules)
```ts
export type * from './types.js'
export * from './helpers.js'
export * from './main.js'
```

### Medium library (5-15 modules)
```ts
// Infrastructure
export type * from './types.js'
export * from './constants.js'
export * from './helpers.js'

// Features
export * from './user.js'
export * from './auth.js'
export * from './session.js'
```

### Large library (15+ modules)
```ts
// ==================== Core ====================
export type * from './types.js'
export * from './constants.js'
export * from './helpers.js'

// ==================== User Module ====================
export * from './user.js'
export * from './user-validator.js'
export * from './user-repository.js'

// ==================== Auth Module ====================
export * from './auth.js'
export * from './auth-provider.js'
export * from './auth-session.js'

// ==================== Utilities ====================
export * from './parser.js'
export * from './formatter.js'
export * from './validator.js'
```

Documentation in barrel files
- **Keep documentation minimal** in the barrel - it lives in source modules
- **Add organizational comments** for section headers in large libraries
- **Link to main documentation** if needed for package overview

```ts
/**
 * @packageDocumentation
 * 
 * Main entry point for the library. All modules are exported here.
 * 
 * @example
 * ```ts
 * import { createServer, DEFAULT_PORT, ServerConfig } from 'my-library'
 * 
 * const server = createServer({ port: DEFAULT_PORT })
 * ```
 */

// Core
export type * from './types.js'
export * from './constants.js'
export * from './helpers.js'

// Main API
export * from './server.js'
```

Maintaining the barrel file

### When adding new modules
1. Create the module in `src/`
2. Add `export * from './module.js'` to `src/index.ts`
3. Run `npm run check` to verify types
4. Run `npm run build` to verify bundling

### When removing modules
1. Remove the module from `src/`
2. Remove `export * from './module.js'` from `src/index.ts`
3. Update CHANGELOG noting breaking change
4. Bump major version per semver

### When renaming modules
1. Rename the file
2. Update the export line in `src/index.ts`
3. This is a breaking change—update CHANGELOG and bump major version

Tooling integration
- **TypeScript** - generates `.d.ts` from this file for consumers
- **Bundlers** - use this as entry point for tree-shaking (unused exports removed)
- **Package.json** - `"exports": { ".": "./dist/index.js" }`
- **tsconfig.json** - `"types": "./dist/index.d.ts"`

Example package.json integration
```json
{
  "name": "my-library",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "types": "./dist/index.d.ts",
  "main": "./dist/index.js"
}
```

Testing the public API
- **No direct tests** for the barrel file itself
- **Tests validate indirectly** by importing from package entry
- **Use package alias** in tests if configured

```ts
// tests/public-api.test.ts
import { describe, it, expect } from 'vitest'
import * as api from '@my-org/my-library' // Import everything
// or
import * as api from '../src/index.js' // Direct import

describe('Public API', () => {
  it('exports all expected modules', () => {
    expect(api).toHaveProperty('createServer')
    expect(api).toHaveProperty('DEFAULT_PORT')
    expect(api).toHaveProperty('ServerConfig')
    // Test spot checks, not exhaustive
  })
})
```

Checklist
- [ ] All modules in `src/` are exported with `export *`
- [ ] New modules added to barrel immediately
- [ ] Removed modules deleted from barrel
- [ ] Exports use `export * from './module.js'` pattern
- [ ] Imports use relative paths with `.js` suffix
- [ ] Exports grouped logically with comments if needed
- [ ] No logic, computations, or side effects
- [ ] No Node-only imports (keep environment-agnostic)
- [ ] No circular imports (modules don't import from barrel)
- [ ] Consistent ordering (alphabetical or by feature)
- [ ] File passes `npm run check` without errors
- [ ] File passes `npm run build` without errors
- [ ] Package.json exports field points to built index
- [ ] Breaking changes documented when removing modules
- [ ] No curation—expose everything for maximum flexibility
