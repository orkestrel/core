---
applyTo: "src/constants.ts"
---

Purpose
- Centralize all immutable constants shared across modules
- Provide single source of truth for configuration values, magic numbers, and fixed data
- Avoid magic values scattered throughout codebase
- Make constants discoverable and maintainable in one location
- **Provide a centralized place to extract and import logic relevant to other modules**
- **Make it easy to deduplicate constant values across the codebase**
- **Ensure related modules have strong connections that are easy to find**

When to create/use
- When sharing fixed values across 2+ modules or exposing constants to external consumers
- For configuration defaults, timeout values, limits, thresholds
- For string literals used in multiple places (error messages, labels, keys)
- For mathematical constants, conversion factors, standard values
- For enum-like values (prefer const objects over TypeScript enums)
- **When you notice the same literal value appearing in multiple modules** - extract it here

When NOT to use
- Do not add constants used in only one module (keep them private in that module)
- Do not read from environment variables at import time (creates side effects)
- Do not compute values from external sources (files, network, process)
- Do not add mutable values or state

Legacy code and TODOs
- **When refactoring**, if you find a constant that's no longer used but provides context, add `// TODO: Evaluate removal - last used in X, kept for reference`
- **For stale constants** only kept to avoid breaking tests, add `// TODO: Remove after updating tests in tests/X.test.ts`
- **For deprecated values**, add `// TODO: Remove in v2.0.0 - replaced by NEW_CONSTANT`
- **For constants that should move**, add `// TODO: Move to dedicated config file when configuration system is implemented`

Required structure/exports
- **Readonly constants** - use `const` declarations, never `let` or `var`
- **Freeze objects/arrays** where applicable using `as const` or `Object.freeze()`
- **Group related constants** together with blank lines separating groups
- **Document units and semantics** - include comments for non-obvious values
- **No env/config reads at import time** - constants must be statically determinable
- **Export with named exports** - no default exports

Naming conventions
- **UPPER_SNAKE_CASE** for primitive constants (strings, numbers, booleans)
- **PascalCase** for object constants that act as namespaces
- **Descriptive names** - avoid abbreviations, make purpose clear
- **Include units in name** when applicable (e.g., `TIMEOUT_MS`, `MAX_SIZE_BYTES`)

Allowed imports and ESM rules
- **Types may be imported** from `src/types.ts` for type annotations
- **Avoid runtime coupling** - do not import from other modules with logic
- **Relative imports include `.js`** suffix (ESM requirement)
- **No Node-only APIs** - constants should be platform-agnostic

Patterns to prefer

### 1. Primitive constants with clear names and units
```ts
/**
 * Maximum file size allowed for uploads in bytes.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Default timeout for HTTP requests in milliseconds.
 */
export const DEFAULT_TIMEOUT_MS = 30_000 // 30 seconds

/**
 * Number of retry attempts for failed operations.
 */
export const MAX_RETRY_ATTEMPTS = 3

/**
 * Default port for the development server.
 */
export const DEFAULT_SERVER_PORT = 3000
```

### 2. Const objects as enum alternatives (preferred over TypeScript enums)
```ts
/**
 * HTTP status codes used throughout the application.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
} as const

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus]
```

### 3. Frozen configuration objects
```ts
/**
 * Default compression settings.
 */
export const DEFAULT_COMPRESSION_OPTIONS = Object.freeze({
  quality: 11,
  mode: 'text' as const,
  enableBrotli: true
})

// Or with as const (preferred for simpler objects)
export const DEFAULT_BUILD_OPTIONS = {
  minify: true,
  sourcemap: false,
  target: 'es2022'
} as const
```

### 4. String literal constants for keys/labels
```ts
/**
 * Error message templates.
 */
export const ERROR_MESSAGES = {
  INVALID_INPUT: 'Invalid input provided',
  NOT_FOUND: 'Resource not found',
  TIMEOUT: 'Operation timed out',
  UNAUTHORIZED: 'Unauthorized access'
} as const

/**
 * Storage keys for local/session storage.
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFS: 'user_preferences',
  THEME: 'theme'
} as const
```

### 5. Readonly arrays of fixed values
```ts
/**
 * Supported file extensions for processing.
 */
export const SUPPORTED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json'
] as const

export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number]

/**
 * Valid log levels in priority order.
 */
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const
export type LogLevel = typeof LOG_LEVELS[number]
```

### 6. Mathematical/scientific constants
```ts
/**
 * Mathematical constant PI to 10 decimal places.
 */
export const PI = 3.1415926536

/**
 * Conversion factor from bytes to kilobytes.
 */
export const BYTES_PER_KB = 1024

/**
 * Conversion factor from milliseconds to seconds.
 */
export const MS_PER_SECOND = 1000
```

### 7. Regular expressions as constants
```ts
/**
 * Regular expression for validating email addresses.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Regular expression for extracting semantic version numbers.
 */
export const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
```

### 8. Grouped constants by domain
```ts
/**
 * Server configuration constants.
 */
export const ServerConfig = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: 'localhost',
  MAX_CONNECTIONS: 100,
  SHUTDOWN_TIMEOUT_MS: 5000,
  REQUEST_TIMEOUT_MS: 30_000
} as const

/**
 * Build system constants.
 */
export const BuildConfig = {
  DIST_DIR: 'dist',
  SRC_DIR: 'src',
  OUTPUT_FORMAT: 'esm',
  MIN_NODE_VERSION: 20
} as const
```

Anti-patterns to avoid

### ❌ Reading environment at import time
```ts
// BAD - causes side effects, not deterministic
export const API_KEY = process.env.API_KEY || 'default'

// GOOD - provide a function that reads env when called
// (This would go in a different module, not constants)
export function getApiKey(): string {
  return process.env.API_KEY || 'default'
}

// BETTER - if needed in constants, use a default only
export const DEFAULT_API_KEY = 'default'
```

### ❌ Mutable values
```ts
// BAD - can be mutated
export let counter = 0
export const config = { debug: false }

// GOOD - immutable
export const INITIAL_COUNTER = 0
export const DEFAULT_CONFIG = Object.freeze({ debug: false })
// or
export const DEFAULT_CONFIG = { debug: false } as const
```

### ❌ Using TypeScript enums
```ts
// BAD - generates runtime code, harder to tree-shake
export enum Status {
  Active = 'active',
  Inactive = 'inactive'
}

// GOOD - pure const object with type
export const Status = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const

export type Status = typeof Status[keyof typeof Status]
```

### ❌ Computed values from external sources
```ts
// BAD - reads from file system
export const VERSION = JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version

// GOOD - hardcode or provide getter function elsewhere
export const VERSION = '1.0.0'
```

### ❌ Magic numbers without context
```ts
// BAD - what is 86400?
export const CACHE_TIME = 86400

// GOOD - clear units and calculation
export const CACHE_TIME_SECONDS = 86_400 // 24 hours * 60 minutes * 60 seconds
// or even better
export const CACHE_TIME_SECONDS = 24 * 60 * 60 // 24 hours in seconds
```

### ❌ Overly generic names
```ts
// BAD - too vague
export const LIMIT = 100
export const TIMEOUT = 5000

// GOOD - specific and clear
export const MAX_ITEMS_PER_PAGE = 100
export const HTTP_REQUEST_TIMEOUT_MS = 5000
```

Documentation standards
- **Every constant or constant group needs a comment** explaining its purpose
- **Include units** in documentation (ms, bytes, seconds, etc.)
- **Explain non-obvious values** - why this specific number/string?
- **Document value ranges** if there are constraints (e.g., "must be between 1-100")
- **Reference standards** if applicable (e.g., "per HTTP RFC 2616")

```ts
/**
 * Default quality level for Brotli compression.
 * 
 * Range: 0 (fastest) to 11 (best compression).
 * Level 11 provides best compression ratio for static assets.
 * 
 * @see https://www.rfc-editor.org/rfc/rfc7932.html
 */
export const BROTLI_QUALITY_DEFAULT = 11
```

Organizing constants in the file
1. **Import statements** (if any)
2. **Application-wide constants** (version, app name, etc.)
3. **Configuration defaults** (timeouts, limits, sizes)
4. **String constants** (error messages, labels, keys)
5. **Numeric constants** (thresholds, conversions, magic numbers)
6. **Collection constants** (arrays, objects as enums)
7. **Regular expressions**
8. **Domain-specific constants** (grouped by feature/module)

Example file structure
```ts
// src/constants.ts
import type { CompressionMode } from './types.js'

// Application metadata
export const APP_NAME = 'MyApp'
export const APP_VERSION = '1.0.0'

// Server configuration
export const ServerConfig = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: 'localhost',
  SHUTDOWN_TIMEOUT_MS: 5000
} as const

// File size limits
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_FILE_COUNT = 100

// Error messages
export const ERROR_MESSAGES = {
  INVALID_INPUT: 'Invalid input provided',
  NOT_FOUND: 'Resource not found'
} as const

// HTTP status codes
export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404
} as const

// Compression settings
export const BROTLI_QUALITY_DEFAULT = 11
export const COMPRESSION_MODES = ['text', 'font', 'generic'] as const
```

Type safety patterns
- Use `as const` to preserve literal types
- Extract types using `typeof` for const objects
- Use `readonly` when defining types for constants

```ts
// Constant with type
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const
export type LogLevel = typeof LOG_LEVELS[number] // 'error' | 'warn' | 'info' | 'debug'

// Const object with extracted type
export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
} as const
export type ThemeMode = typeof Theme[keyof typeof Theme] // 'light' | 'dark' | 'auto'
```

Performance and bundle size
- **Tree-shaking friendly** - named exports allow unused constants to be removed
- **No runtime overhead** - simple const declarations compile away
- **Prefer primitive values** over objects for frequently used constants
- **Use numeric literals with underscores** for readability (e.g., `1_000_000`)

Tests
- **Optional** - constants typically don't need dedicated tests
- **Verify invariants** if logic is involved in construction (generally none)
- **Test type extraction** if using complex typeof patterns

```ts
// tests/constants.test.ts (optional)
import { describe, it, expect, expectTypeOf } from 'vitest'
import { HttpStatus, SUPPORTED_EXTENSIONS } from '../src/constants.js'
import type { HttpStatusCode } from '../src/constants.js'

describe('constants', () => {
  it('HttpStatus values are numbers', () => {
    expect(HttpStatus.OK).toBe(200)
    expect(HttpStatus.NOT_FOUND).toBe(404)
  })

  it('HttpStatusCode type is correct', () => {
    expectTypeOf<HttpStatusCode>().toEqualTypeOf<200 | 201 | 400 | 401 | 404 | 500>()
  })

  it('SUPPORTED_EXTENSIONS is readonly', () => {
    expectTypeOf(SUPPORTED_EXTENSIONS).toBeReadonly()
  })
})
```

Checklist
- [ ] All constants use `const` (never `let` or `var`)
- [ ] UPPER_SNAKE_CASE naming for primitive constants
- [ ] PascalCase naming for object constants
- [ ] Names include units (MS, BYTES, SECONDS) where applicable
- [ ] Objects/arrays use `as const` or `Object.freeze()`
- [ ] No environment variable reads at import time
- [ ] No computed values from external sources
- [ ] No mutable state or side effects
- [ ] All constants documented with purpose and units
- [ ] Related constants grouped logically
- [ ] Non-obvious values explained with comments
- [ ] No TypeScript enums (use const objects instead)
- [ ] Named exports only (no default exports)
- [ ] No Node-only API usage
- [ ] Types extracted with `typeof` where needed
- [ ] File passes `npm run check` without errors
- [ ] File passes `npm run format` without changes
