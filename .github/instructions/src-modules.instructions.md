---
applyTo: "src/**/*.ts,!src/index.ts,!src/types.ts,!src/helpers.ts,!src/constants.ts,!src/cli.ts"
---

Purpose
- Leaf modules implementing concrete features and domain logic
- Single-responsibility modules focused on specific capabilities
- Must remain environment-agnostic (isomorphic) to work in both browser and server
- Compose together helpers, types, and constants to deliver features

When to create/use
- For concrete features and business logic not covered by helpers/constants/types
- When implementing specific functionality: user management, data processing, API clients
- When a feature needs multiple related functions or a class with methods
- When logic is complex enough to deserve its own module separate from helpers

When NOT to create
- For simple utilities (put in `src/helpers.ts`)
- For shared types (put in `src/types.ts`)
- For constants (put in `src/constants.ts`)
- For CLI-specific code (put in `src/cli.ts`)
- For code that only runs on Node/server (create clearly marked server-only entrypoint)

Required structure/exports
- **Named exports only** - no default exports
- **No top-level side effects** - no code execution at import time
- **Small, single-responsibility modules** with single-word filenames where practical
- **Expose only what consumers need** - keep internals private
- **Pure exports** - functions, classes, type guards, not mutable state

Naming conventions
- **Single-word filenames** where practical: `user.ts`, `auth.ts`, `parser.ts`
- **Two-word filenames** when needed for clarity: `email-validator.ts`, `rate-limiter.ts`
- **Use kebab-case** for multi-word files: `file-system.ts`, `data-transformer.ts`
- **Avoid prefixes** like `utils-`, `lib-`, `service-` unless part of domain language

Allowed imports and ESM rules
- **Import shared items** from `src/types.ts`, `src/helpers.ts`, and `src/constants.ts`
- **Import from other leaf modules** when needed (avoid circular dependencies)
- **Relative imports include `.js` suffix** - ESM requirement
- **ESM-only patterns** - no CommonJS (`require`, `module.exports`)
- **Do not import Node built-ins** or rely on Node globals in these modules
  - ❌ Cannot use: `fs`, `path`, `process`, `Buffer`, `util`, `os`, `crypto` (Node version)
  - ✅ Can use: Web APIs like `URL`, `URLSearchParams`, `TextEncoder`, `fetch`, `crypto` (Web Crypto)

Patterns to prefer

### 1. Factory functions for creating instances
```ts
import type { User, UserOptions } from './types.js'
import { validateEmail } from './helpers.js'
import { DEFAULT_USER_ROLE } from './constants.js'

/**
 * Creates a new user instance with validated data.
 * 
 * @param options - User creation options
 * @returns User object
 * @throws TypeError if email is invalid
 */
export function createUser(options: UserOptions): User {
  if (!validateEmail(options.email)) {
    throw new TypeError(`Invalid email: ${options.email}`)
  }

  return {
    id: generateId(),
    name: options.name,
    email: options.email,
    role: options.role ?? DEFAULT_USER_ROLE,
    createdAt: new Date().toISOString()
  }
}
```

### 2. Classes with clear responsibilities
```ts
import type { CacheOptions } from './types.js'

/**
 * Simple in-memory cache with TTL support.
 */
export class Cache<K, V> {
  readonly #store = new Map<K, { value: V; expiry: number }>()
  readonly #ttlMs: number

  constructor(options: CacheOptions = {}) {
    this.#ttlMs = options.ttlMs ?? 60_000 // 1 minute default
  }

  get(key: K): V | undefined {
    const entry = this.#store.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiry) {
      this.#store.delete(key)
      return undefined
    }

    return entry.value
  }

  set(key: K, value: V): void {
    this.#store.set(key, {
      value,
      expiry: Date.now() + this.#ttlMs
    })
  }

  clear(): void {
    this.#store.clear()
  }
}
```

### 3. Type guards for domain validation
```ts
import type { ServerCommand } from './types.js'

/**
 * Type guard that validates an unknown value is a ServerCommand.
 * 
 * @param value - Value to validate
 * @returns True if value is a valid ServerCommand
 */
export function isServerCommand(value: unknown): value is ServerCommand {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    'label' in value &&
    typeof value.label === 'string' &&
    'action' in value &&
    typeof value.action === 'function'
  )
}
```

### 4. Validation functions returning Result types
```ts
import type { ValidationResult } from './types.js'

/**
 * Validates user input data.
 * 
 * @param data - Data to validate
 * @returns Validation result with success/error
 */
export function validateUserData(data: unknown): ValidationResult {
  const errors: string[] = []

  if (typeof data !== 'object' || data === null) {
    return { success: false, errors: ['Data must be an object'] }
  }

  if (!('name' in data) || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string')
  }

  if (!('email' in data) || !isValidEmail(data.email)) {
    errors.push('Valid email is required')
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true }
}
```

### 5. Dependency injection for platform-specific code
```ts
// Define interface for platform-specific capability
export interface FileReader {
  readFile(path: string): Promise<string>
}

// Accept implementation as parameter (DI)
export async function loadConfig(reader: FileReader): Promise<Config> {
  const content = await reader.readFile('config.json')
  return JSON.parse(content)
}

// Node implementation provided separately (in cli.ts or tests)
// import { readFile } from 'node:fs/promises'
// const nodeReader: FileReader = {
//   readFile: async (path) => readFile(path, 'utf-8')
// }
```

### 6. Readonly return values
```ts
/**
 * Finds users matching the given criteria.
 * 
 * @param criteria - Search criteria
 * @returns Readonly array of matching users
 */
export function findUsers(criteria: SearchCriteria): readonly User[] {
  const results = users.filter((user) => matchesCriteria(user, criteria))
  return Object.freeze(results)
}
```

Anti-patterns to avoid

### ❌ Hidden shared helpers/types in leaf modules
```ts
// BAD - helper used by multiple modules hidden here
function formatDate(date: Date): string {
  return date.toISOString()
}

export function createUser(name: string): User {
  return { name, createdAt: formatDate(new Date()) }
}

// GOOD - extract to src/helpers.ts if reused
import { formatDate } from './helpers.js'

export function createUser(name: string): User {
  return { name, createdAt: formatDate(new Date()) }
}
```

### ❌ Tightly coupled modules
```ts
// BAD - direct coupling
import { UserService } from './user-service.js'

export function authenticate() {
  const service = new UserService() // Hard dependency
  return service.findUser()
}

// GOOD - dependency injection
import type { UserService } from './types.js'

export function authenticate(userService: UserService) {
  return userService.findUser()
}
```

### ❌ Top-level mutable state
```ts
// BAD - global mutable state
let userCache: User[] = []

export function addUser(user: User): void {
  userCache.push(user)
}

// GOOD - encapsulated in class or function scope
export class UserCache {
  #users: User[] = []

  addUser(user: User): void {
    this.#users.push(user)
  }
}
```

### ❌ Type assertions and non-null assertions
```ts
// BAD - unsafe casts
const user = data as User
const name = user.name!

// GOOD - type guards and proper narrowing
if (isUser(data)) {
  const name = data.name
}
```

### ❌ Importing Node-only modules
```ts
// BAD - breaks browser compatibility
import { readFileSync } from 'node:fs'

export function loadData(): string {
  return readFileSync('data.txt', 'utf-8')
}

// GOOD - dependency injection or Web APIs
export async function loadData(fetcher: (url: string) => Promise<Response>): Promise<string> {
  const response = await fetcher('/data.txt')
  return response.text()
}
```

### ❌ Side effects at module scope
```ts
// BAD - executes on import
console.log('Module loaded')
initializeGlobalState()

// GOOD - export functions caller can invoke
export function initialize(): void {
  initializeState()
}
```

Function signature patterns
- **Accept `unknown` for untrusted input**, narrow with type guards
- **Use `readonly` for input parameters** that are collections
- **Return `readonly` for collections** unless mutation is intentional
- **Explicit return types** on all public functions
- **Options objects** for functions with many parameters

```ts
// GOOD - well-typed signature
export function processItems(
  items: readonly Item[],
  options: ProcessOptions = {}
): readonly ProcessedItem[] {
  // implementation
}
```

Error handling patterns
- **Throw TypeError** for invalid inputs with structured messages
- **Return Result types** for operations that can fail gracefully
- **Document thrown errors** in TSDoc with `@throws`

```ts
/**
 * Parses a JSON string into an object.
 * 
 * @param json - JSON string to parse
 * @returns Parsed object
 * @throws {TypeError} If json is not a valid JSON string
 */
export function parseJson(json: string): unknown {
  if (typeof json !== 'string') {
    throw new TypeError('Input must be a string')
  }

  try {
    return JSON.parse(json)
  } catch (error) {
    throw new TypeError(`Invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}
```

Class design patterns
- **Use `#` private fields** for true encapsulation (runtime-enforced)
- **Readonly public properties** via getters if needed
- **No mutable public fields** - use getters/setters
- **Clear constructor signatures** with options objects

```ts
export class RateLimiter {
  readonly #maxRequests: number
  readonly #windowMs: number
  #requests: number[] = []

  constructor(options: RateLimiterOptions) {
    this.#maxRequests = options.maxRequests
    this.#windowMs = options.windowMs
  }

  // Public getter (readonly)
  get requestCount(): number {
    this.#cleanupOldRequests()
    return this.#requests.length
  }

  // Public method
  tryAcquire(): boolean {
    this.#cleanupOldRequests()
    
    if (this.#requests.length >= this.#maxRequests) {
      return false
    }

    this.#requests.push(Date.now())
    return true
  }

  // Private method
  #cleanupOldRequests(): void {
    const cutoff = Date.now() - this.#windowMs
    this.#requests = this.#requests.filter((time) => time > cutoff)
  }
}
```

Documentation standards
- **Every public export needs TSDoc** - functions, classes, exported constants
- **Include `@param` for each parameter** with description
- **Include `@returns` for return value** with description
- **Include `@throws` for thrown errors** with conditions
- **Include `@example`** showing typical usage with TypeScript fence
- **Document edge cases** and limitations

```ts
/**
 * Compresses a string using Brotli compression.
 * 
 * Returns a compressed buffer that can be decompressed using the
 * corresponding decompress function.
 * 
 * @param input - String to compress
 * @param options - Compression options
 * @returns Compressed buffer
 * @throws {TypeError} If input is not a string
 * 
 * @example
 * ```ts
 * const compressed = compress('Hello, World!')
 * console.log(compressed.length) // Smaller than input
 * ```
 */
export function compress(
  input: string,
  options: CompressOptions = {}
): Uint8Array {
  // implementation
}
```

Testing requirements
- **Mirror test file** in `tests/` directory
- **One `describe` block per module**
- **Nested `describe` per function/method**
- **Cover happy path and edge cases**
- **Test error conditions** with invalid inputs

```ts
// tests/user.test.ts
import { describe, it, expect } from 'vitest'
import { createUser, isValidUser } from '../src/user.js'

describe('user', () => {
  describe('createUser', () => {
    it('creates user with valid input', () => {
      const user = createUser({ name: 'John', email: 'john@example.com' })
      expect(user).toHaveProperty('id')
      expect(user.name).toBe('John')
    })

    it('throws for invalid email', () => {
      expect(() => createUser({ name: 'John', email: 'invalid' }))
        .toThrow(TypeError)
    })
  })

  describe('isValidUser', () => {
    it('returns true for valid user', () => {
      const user = { id: '1', name: 'John', email: 'john@example.com' }
      expect(isValidUser(user)).toBe(true)
    })

    it('returns false for missing fields', () => {
      expect(isValidUser({ name: 'John' })).toBe(false)
    })
  })
})
```

Module organization within file
1. **Imports** - types, helpers, constants, other modules
2. **Private helpers** - functions not exported (prefix with `_` or keep in scope)
3. **Type guards** - `is` functions for validation
4. **Factory functions** - create instances
5. **Main functions** - core module functionality
6. **Classes** - if needed for stateful logic
7. **Exports** - public API (usually handled by named exports at declaration)

Legacy code and TODOs
- **For stale/legacy code** that's no longer actively used but provides context, add `// TODO: Evaluate removal - legacy code from X feature, kept for reference`
- **For code kept only to avoid breaking tests**, add `// TODO: Remove after refactoring tests in tests/X.test.ts`
- **For files that should be deleted**, add a comment at the top: `// TODO: DELETE FILE - functionality moved to Y.ts, kept temporarily to avoid breaking tests`
- **For deprecated exports**, add `// TODO: Remove in v2.0.0 - deprecated, use X instead`
- **For refactoring candidates**, add `// TODO: Extract to separate module when X grows beyond Y lines/complexity`
- **For incomplete implementations**, add `// TODO: Implement remaining functionality - see Phase X in ideas.md`

Checklist
- [ ] Single-responsibility module focused on one feature/domain
- [ ] Named exports only (no default exports)
- [ ] No top-level side effects or mutable state
- [ ] Imports use `.js` suffix for relative paths
- [ ] Reuses types from `src/types.ts`
- [ ] Reuses helpers from `src/helpers.ts`
- [ ] Reuses constants from `src/constants.ts`
- [ ] No Node-only APIs (fs, process, Buffer, etc.)
- [ ] Classes use `#` private fields for encapsulation
- [ ] Functions have explicit return types
- [ ] Collections use `readonly` where appropriate
- [ ] No `any`, no `as`, no `!` type assertions
- [ ] Type guards use `is` predicate correctly
- [ ] Error handling uses TypeError with structured messages
- [ ] All public exports have TSDoc with examples
- [ ] Exported to `src/index.ts` barrel if part of public API
- [ ] Mirror test file exists in `tests/` directory
- [ ] Tests cover happy path, edge cases, and errors
- [ ] **TODOs added for legacy/stale code** that needs evaluation
- [ ] **TODOs added for files** that should be removed
- [ ] File passes `npm run check` without errors
- [ ] File passes `npm run format` without changes
- [ ] All tests pass with `npm test`
