---
applyTo: "src/types.ts"
---

Purpose
- Centralize all exported types, interfaces, enums, and type utilities used across modules
- Serve as the single source of truth for shared data structures and contracts
- Keep type definitions separate from runtime code for clarity and maintainability
- **Provide a centralized place to extract and import logic relevant to other modules**
- **Make it easy to deduplicate type definitions across the codebase**
- **Ensure related modules have strong connections that are easy to find**

When to create/use
- When multiple modules share types or external consumers need them
- For public API contracts that define function parameters and return types
- For discriminated unions representing domain entities or states
- For options objects passed to exported functions/classes
- When type definitions would otherwise be duplicated across modules
- **When you notice the same type structure appearing in multiple modules** - extract it here

When NOT to use
- For types used in only one module (keep them private in that module)
- For types that are tightly coupled to implementation details of a single module

Required structure/exports
- **Export readonly, precise types** - avoid broad unions like `string | number` without semantic meaning
- **Keep this file free of runtime logic** - no functions, no constants, no executable code
- **Use `readonly` modifiers** on all array and object properties unless mutation is intentional
- **Prefer interfaces for object shapes** - easier to extend and debug
- **Use type aliases for unions, intersections, and mapped types**
- **Document complex types** with TSDoc comments explaining purpose and constraints
- **Group related types** together with blank lines separating groups

Naming conventions
- **Interfaces**: PascalCase, descriptive nouns (e.g., `ServerCommand`, `ValidationResult`)
- **Type aliases**: PascalCase, match interface conventions (e.g., `CommandId`, `StatusCode`)
- **Enums**: PascalCase for name, UPPER_SNAKE_CASE for members (avoid enums, prefer unions of literals)
- **Options interfaces**: Suffix with `Options` (e.g., `CompressOptions`, `BuildOptions`)
- **Result interfaces**: Suffix with `Result` (e.g., `ExecutionResult`, `ParseResult`)
- **Generic type parameters**: Single uppercase letter or descriptive PascalCase (`T`, `TValue`, `TError`)

Allowed imports and ESM rules
- **May import other types** from this file or external type-only packages
- **Do not import runtime modules** - no imports from `src/helpers.ts`, `src/constants.ts`, or leaf modules
- **Use `import type`** syntax when importing types from external packages for clarity
- **No circular dependencies** - if type A depends on type B, B should not depend on A

Patterns to prefer

### 1. Exact object shapes with readonly
```ts
export interface ServerCommand {
  readonly id: string
  readonly label: string
  readonly description?: string
  readonly category?: 'server' | 'system' | 'diagnostic'
}
```

### 2. Discriminated unions for variants
```ts
export type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E }
```

### 3. Options objects with optional fields
```ts
export interface CompressionOptions {
  readonly quality?: number
  readonly mode?: 'text' | 'font' | 'generic'
  readonly outputPath?: string
}
```

### 4. Branded types for type safety
```ts
export type CommandId = string & { readonly __brand: 'CommandId' }
export type FilePath = string & { readonly __brand: 'FilePath' }
```

### 5. Utility types for transformations
```ts
export type ReadonlyDeep<T> = {
  readonly [K in keyof T]: T[K] extends object ? ReadonlyDeep<T[K]> : T[K]
}
```

### 6. Enum alternatives using const objects
```ts
export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
} as const

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus]
```

Anti-patterns to avoid

### ❌ Using `any`
```ts
// BAD
export interface Config {
  options: any
}

// GOOD
export interface Config {
  readonly options: Record<string, unknown>
}
```

### ❌ Non-null assertions or type assertions
```ts
// BAD - these belong in runtime code, not type definitions
export type ParsedValue = (value: string) => number!
export type CastValue = (value: unknown) => value as SomeType
```

### ❌ Mutable interfaces
```ts
// BAD
export interface User {
  name: string
  email: string
}

// GOOD
export interface User {
  readonly name: string
  readonly email: string
}
```

### ❌ Overly broad types
```ts
// BAD
export type Input = string | number | boolean | object

// GOOD
export type CommandInput = string
export type NumericInput = number
export type BooleanFlag = boolean
```

### ❌ Runtime logic in type file
```ts
// BAD
export interface Command {
  id: string
}
export function createCommand(id: string): Command {
  return { id } // No functions here!
}

// GOOD - function goes in a module, type stays here
export interface Command {
  readonly id: string
}
```

### ❌ Enums (prefer union types)
```ts
// BAD - runtime code in type file
export enum Status {
  Active = 'active',
  Inactive = 'inactive'
}

// GOOD - pure type
export type Status = 'active' | 'inactive'
```

Type guard guidelines
- **User-defined type guards live near producers in leaf modules, not here**
- Export the type from `src/types.ts`, export the guard from the module that uses it
- Type guards should be pure functions with `is` predicate: `function isFoo(v: unknown): v is Foo`
- Guards should not mutate the value being checked

Example structure
```ts
// src/types.ts
export interface ServerCommand {
  readonly id: string
  readonly label: string
  readonly action: () => void | Promise<void>
}

// src/commands.ts (separate file)
import type { ServerCommand } from './types.js'

export function isServerCommand(value: unknown): value is ServerCommand {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'label' in value &&
    typeof value.label === 'string' &&
    'action' in value &&
    typeof value.action === 'function'
  )
}
```

Documentation standards
- **Complex types need TSDoc** explaining purpose, constraints, and examples
- **Simple types can omit docs** if the name is self-explanatory
- **Options interfaces** should document each field's purpose
- **Discriminated unions** should document each variant

```ts
/**
 * Represents the result of a command execution.
 * 
 * Use the `success` discriminant to narrow the type:
 * - When `success: true`, the `value` property is available
 * - When `success: false`, the `error` property is available
 * 
 * @example
 * ```ts
 * const result: ExecutionResult<string> = executeCommand()
 * if (result.success) {
 *   console.log(result.value) // Type: string
 * } else {
 *   console.error(result.error) // Type: Error
 * }
 * ```
 */
export type ExecutionResult<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: Error }
```

Organizing types in the file
1. **Import statements** (if any)
2. **Utility types** (generic helpers)
3. **Core domain types** (entities, value objects)
4. **Options interfaces** (configuration objects)
5. **Result/response types** (function outputs)
6. **Union types and discriminated unions** (variants)
7. **Type aliases for convenience** (branded types, subsets)

Tests
- **Types are validated via typecheck** - `npm run check` must pass
- **Usage in modules/tests** validates type correctness
- **No dedicated test file** for types unless testing utility type behavior
- **Consider type tests** for complex mapped/conditional types:

```ts
// tests/types.test.ts (optional, for complex utility types)
import { describe, it, expectTypeOf } from 'vitest'
import type { ReadonlyDeep, Result } from '../src/types.js'

describe('ReadonlyDeep', () => {
  it('makes nested objects readonly', () => {
    type Input = { a: { b: string } }
    type Output = ReadonlyDeep<Input>
    expectTypeOf<Output>().toMatchTypeOf<{ readonly a: { readonly b: string } }>()
  })
})
```

Checklist
- [ ] All exported types follow naming conventions
- [ ] All object properties use `readonly` modifier
- [ ] No `any`, no `!`, no `as` in type definitions
- [ ] Complex types have TSDoc documentation
- [ ] Types are grouped logically with blank lines
- [ ] No runtime code (functions, constants, executables)
- [ ] No imports from runtime modules
- [ ] Generic types are appropriately constrained
- [ ] Options interfaces use optional fields with clear defaults
- [ ] Discriminated unions have explicit discriminant fields
- [ ] Utility types are exported if used in multiple places
- [ ] Type guards live in separate modules, not here
- [ ] File passes `npm run check` without errors
- [ ] Breaking type changes update all usage sites
