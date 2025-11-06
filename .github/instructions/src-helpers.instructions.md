---
applyTo: "src/helpers.ts"
---

Purpose
- Shared, pure utility functions reused across multiple modules
- Keep helpers environment-agnostic (isomorphic) with no reliance on Node-only APIs
- Provide deterministic, side-effect-free transformations and computations
- Serve as the central location for cross-cutting concerns like validation, formatting, and data manipulation
- **Provide a centralized place to extract and import logic relevant to other modules**
- **Make it easy to deduplicate helper functions across the codebase**
- **Ensure related modules have strong connections that are easy to find**

When to create/use
- When logic is reused in 2+ modules and has no I/O or side effects
- For pure transformations: formatting, parsing, validation, mapping
- For common algorithms: sorting, filtering, reducing, searching
- For type narrowing: type guards, assertion functions
- When extracting helper from a module would improve clarity and testability
- **When you notice the same utility function appearing in multiple modules** - extract it here

When NOT to use (anti-patterns)
- Do not add helpers used in only one module (keep them private in that module)
- Do not add helpers with side effects (I/O, timers, mutations, logging)
- Do not add helpers that depend on Node-only APIs (move to CLI or server-only code)
- Do not add helpers that read/write to databases, files, or network
- Do not add helpers that manage mutable state or global variables

Legacy code and TODOs
- **When refactoring**, if you find a helper that's no longer used but might provide context, add a `// TODO: Evaluate removal - last used in X, kept for reference`
- **For stale helpers** that are only kept to avoid breaking tests, add `// TODO: Remove after updating tests in tests/X.test.ts`
- **For helpers that should be extracted** to a separate module, add `// TODO: Extract to dedicated module when X functionality grows`

Required structure/exports
- **Small, single-purpose functions** - each helper does one thing well
- **Deterministic and side-effect free** - same inputs always produce same outputs
- **Export only helpers intended for reuse** - do not re-export incidental helpers via the barrel
- **No default exports** - use named exports only
- **Pure functions with clear inputs/outputs** - all dependencies as parameters
- **Descriptive names** - helpers can be 2-3 words if needed for clarity

Allowed imports and ESM rules
- **Import types** from `src/types.ts` for strict typing
- **Import constants** from `src/constants.ts` for shared values
- **Relative imports include `.js`** suffix (ESM requirement)
- **Named exports only** - no default exports
- **No Node built-ins or globals** here - prefer Web APIs or plain TypeScript
  - ❌ Cannot use: `fs`, `path`, `process`, `Buffer`, `util`, `os`, `crypto` (Node version)
  - ✅ Can use: `URL`, `URLSearchParams`, `TextEncoder`, `TextDecoder`, `crypto` (Web Crypto API)

Patterns to prefer

### 1. Pure transformation functions
```ts
/**
 * Formats a file size in bytes to a human-readable string.
 * 
 * @param bytes - Size in bytes
 * @returns Formatted string with appropriate unit
 * 
 * @example
 * ```ts
 * formatFileSize(1024) // '1.00 KB'
 * formatFileSize(1536) // '1.50 KB'
 * formatFileSize(1048576) // '1.00 MB'
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(2)} ${units[exponent]}`
}
```

### 2. Type guards for narrowing unknown
```ts
import type { ServerCommand } from './types.js'

/**
 * Type guard that checks if a value is a valid ServerCommand.
 * 
 * @param value - Value to check
 * @returns True if value conforms to ServerCommand interface
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

### 3. Validation helpers returning boolean
```ts
/**
 * Validates that a string is a valid URL.
 * 
 * @param value - String to validate
 * @returns True if string is a valid URL
 */
export function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
```

### 4. Assertion functions that throw
```ts
/**
 * Asserts that a value is defined (not null or undefined).
 * Throws TypeError if assertion fails.
 * 
 * @param value - Value to check
 * @param label - Descriptive label for error message
 * @throws TypeError if value is null or undefined
 */
export function assertDefined<T>(
  value: T,
  label: string
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new TypeError(`${label} must be defined, received ${value}`)
  }
}
```

### 5. Data transformation helpers
```ts
/**
 * Deeply freezes an object and all nested objects.
 * 
 * @param obj - Object to freeze
 * @returns Frozen object
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj)
  Object.values(obj).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      deepFreeze(value)
    }
  })
  return obj
}
```

### 6. Array/collection utilities
```ts
/**
 * Removes duplicate values from an array using strict equality.
 * 
 * @param arr - Array to deduplicate
 * @returns New array with duplicates removed
 */
export function unique<T>(arr: readonly T[]): T[] {
  return [...new Set(arr)]
}

/**
 * Groups array items by a key function.
 * 
 * @param arr - Array to group
 * @param keyFn - Function that returns the group key for each item
 * @returns Map of keys to arrays of items
 */
export function groupBy<T, K>(
  arr: readonly T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of arr) {
    const key = keyFn(item)
    const group = map.get(key)
    if (group) {
      group.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return map
}
```

### 7. String utilities
```ts
/**
 * Converts a string to camelCase.
 * 
 * @param str - String to convert
 * @returns camelCase string
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
}

/**
 * Truncates a string to a maximum length, adding ellipsis if needed.
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}
```

Anti-patterns to avoid

### ❌ Side effects (I/O, timers, mutations)
```ts
// BAD - writes to file system
export function saveToFile(data: string, path: string): void {
  fs.writeFileSync(path, data) // NO! This is I/O
}

// BAD - sets timeout
export function delayedLog(message: string): void {
  setTimeout(() => console.log(message), 1000) // NO! Side effect
}

// BAD - mutates input
export function sortArray<T>(arr: T[]): T[] {
  arr.sort() // NO! Mutates input
  return arr
}

// GOOD - pure, returns new array
export function sortArray<T>(arr: readonly T[]): T[] {
  return [...arr].sort()
}
```

### ❌ Node-only features
```ts
// BAD - uses Node's Buffer
export function encodeBase64(str: string): string {
  return Buffer.from(str).toString('base64') // NO! Node-only
}

// GOOD - uses Web APIs
export function encodeBase64(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  return btoa(String.fromCharCode(...bytes))
}
```

### ❌ Global state or dependencies
```ts
// BAD - depends on global variable
let counter = 0
export function getNextId(): number {
  return ++counter // NO! Mutable global state
}

// GOOD - pure function with parameter
export function getNextId(currentId: number): number {
  return currentId + 1
}
```

### ❌ Overly complex helpers
```ts
// BAD - does too many things
export function processUserData(
  user: unknown,
  config: unknown,
  database: unknown
): unknown {
  // 50+ lines of validation, transformation, and I/O
  // This should be multiple functions in a dedicated module
}

// GOOD - single purpose
export function validateUserEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
```

Function signature patterns
- **Parameters**: Accept readonly for collections, prefer specific types over `unknown` when possible
- **Return types**: Explicitly type all returns, use readonly for returned collections
- **Generics**: Constrain when needed (`<T extends object>`), use descriptive names for multiple params
- **Overloads**: Provide only when they clearly improve ergonomics, keep minimal

```ts
// Good signature with readonly inputs/outputs
export function filterDefined<T>(
  arr: readonly (T | null | undefined)[]
): T[] {
  return arr.filter((item): item is T => item !== null && item !== undefined)
}
```

Error handling
- **Validation functions** return boolean (e.g., `isValidEmail`)
- **Assertion functions** throw TypeError with structured message
- **Parsing functions** return discriminated union (success/error)

```ts
export type ParseResult<T> = 
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: string }

export function parsePositiveInteger(value: string): ParseResult<number> {
  const num = Number(value)
  if (Number.isNaN(num)) {
    return { success: false, error: 'Not a number' }
  }
  if (!Number.isInteger(num)) {
    return { success: false, error: 'Not an integer' }
  }
  if (num <= 0) {
    return { success: false, error: 'Not positive' }
  }
  return { success: true, value: num }
}
```

Documentation standards
- **Every exported helper needs TSDoc** with description, params, returns, and example
- **Examples should be copy-pasteable** and demonstrate typical usage
- **Document edge cases** (empty arrays, null inputs, special values)
- **Note thrown errors** in @throws tags

Testing requirements
- **Mirror tests in `tests/helpers.test.ts`** - one describe block per helper
- **Cover happy path** - typical usage scenarios
- **Cover edge cases** - empty inputs, null, undefined, extreme values
- **Test determinism** - same input produces same output
- **Test purity** - original inputs unchanged

```ts
// tests/helpers.test.ts
import { describe, it, expect } from 'vitest'
import { formatFileSize, unique, truncate } from '../src/helpers.js'

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1024)).toBe('1.00 KB')
    expect(formatFileSize(1048576)).toBe('1.00 MB')
  })

  it('handles fractional values', () => {
    expect(formatFileSize(1536)).toBe('1.50 KB')
  })
})

describe('unique', () => {
  it('removes duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
  })

  it('handles empty array', () => {
    expect(unique([])).toEqual([])
  })

  it('does not mutate input', () => {
    const input = [1, 2, 2]
    unique(input)
    expect(input).toEqual([1, 2, 2])
  })
})
```

Performance considerations
- **Prefer built-in methods** over manual loops when equivalent
- **Avoid premature optimization** - clarity first, optimize if needed
- **Document O(n) complexity** for non-obvious algorithms
- **Use memoization sparingly** - only for expensive pure computations with hot paths

```ts
// Document complexity for non-trivial algorithms
/**
 * Finds the intersection of two arrays.
 * Time complexity: O(n + m) where n and m are array lengths.
 * 
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Array containing values present in both inputs
 */
export function intersection<T>(
  arr1: readonly T[],
  arr2: readonly T[]
): T[] {
  const set2 = new Set(arr2)
  return arr1.filter((item) => set2.has(item))
}
```

Checklist
- [ ] All helpers are pure functions (deterministic, no side effects)
- [ ] No I/O operations (network, file system, console)
- [ ] No Node-only APIs used (use Web APIs instead)
- [ ] All helpers exported with named exports
- [ ] Each helper has clear, descriptive name
- [ ] Every helper has TSDoc with @param, @returns, @example
- [ ] All parameters and returns explicitly typed
- [ ] Input parameters use `readonly` for collections
- [ ] Return types use `readonly` for collections where appropriate
- [ ] Type guards use `is` predicate correctly
- [ ] Assertion functions use `asserts` correctly
- [ ] No mutation of input parameters
- [ ] Error handling follows patterns (boolean, throw, Result type)
- [ ] Tests exist in `tests/helpers.test.ts` for all helpers
- [ ] Tests cover happy path and edge cases
- [ ] Tests verify purity (inputs unchanged)
- [ ] File passes `npm run check` without errors
- [ ] File passes `npm run format` without changes
- [ ] All tests pass with `npm test`
