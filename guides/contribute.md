# Contribute

<!-- Template: Development workflow and guidelines -->

A guide for contributing to @orkestrel/core with confidence.

## Quick start

```sh
npm install          # Install dependencies
npm run check        # Typecheck
npm run test         # Run tests
npm run format       # Lint and fix
npm run build        # Build ESM + types
```

## Principles

| Principle                 | Description                               |
|---------------------------|-------------------------------------------|
| **Determinism**           | Same inputs → same outputs                |
| **Strong typing**         | No `any`, no `!`, honest types            |
| **Small surface**         | Minimal APIs, real use cases drive growth |
| **Portability**           | Browser + Node compatible                 |
| **Predictable lifecycle** | Sync providers, async in hooks            |

## Workflow

1. Edit source in `src/`
2. Mirror tests in `tests/` (one test file per source)
3. Run validation:

```sh
npm run check   # Must pass
npm run test    # Must pass
npm run format  # Must pass
npm run build   # Must succeed
```

## File structure

```
src/
  index.ts         # Barrel exports (no logic)
  types.ts         # Centralized types
  helpers.ts       # Shared helpers
  constants.ts     # Immutable constants
  adapter.ts       # Base Adapter class
  ports.ts         # Port token helpers
  adapters/        # Built-in adapters
tests/
  [file].test.ts   # Mirrors src/[file].ts
```

## Coding standards

### TypeScript

- No `any`
- No non-null assertions (`!`)
- Avoid type assertions (`as`)
- Validate at edges: accept `unknown`, narrow with guards
- Prefer `readonly` for public outputs
- ESM imports with `.js` extension

### Naming

- Clear words, avoid abbreviations
- Public methods: 1-2 words
- Private methods: 2-3 words allowed
- Use `#` for private fields

### Encapsulation

- Use `#` private fields (runtime-enforced)
- Public getters return copies or readonly views
- No mutable state exposed

## TSDoc policy

### Public classes/functions

Full TSDoc with description, params, returns, and example:

```ts
/**
 * Create a token.
 *
 * @param description - Token description
 * @returns A new unique token
 * @example
 * ```ts
 * const Token = createToken<number>('port')
 * ```
 */
```

### Options objects

List properties in description (TSDoc doesn't support dotted params):

```ts
/**
 * Construct a container.
 *
 * @param options - Configuration options:
 * - parent: Optional parent container
 * - logger: Optional logger port
 */
```

### Simple getters

Concise description only, no example:

```ts
/**
 * Get the current state.
 *
 * @returns The lifecycle state
 */
get state(): LifecycleState { ... }
```

### Private/internal

Single-line comment only:

```ts
// Internal: validate transition edges
#validateTransition(target: LifecycleState): void { ... }
```

## Architecture

### Adapter pattern

All components extend `Adapter`:

```ts
class MyService extends Adapter {
  protected async onStart() { }
  protected async onStop() { }
}
```

### Singleton lifecycle

Static methods manage singleton:

```ts
await MyService.start()
await MyService.stop()
await MyService.destroy()
```

### Container registration

```ts
container.register(Token, { adapter: MyService })
```

### Explicit dependencies

```ts
container.register(Token, { 
  adapter: MyService, 
  dependencies: [DependencyToken] 
})
```

## Testing

- Mirror source: `tests/[file].test.ts`
- No mocks/fakes/spies in core
- Small timeouts (10-50ms)
- Cover: success, failure, timeout, ordering

```ts
import { describe, test, beforeEach, afterEach } from 'vitest'

describe('MyAdapter', () => {
  afterEach(async () => {
    await MyAdapter.destroy().catch(() => {})
  })

  test('starts successfully', async () => {
    await MyAdapter.start({ timeouts: 50 })
    assert.equal(MyAdapter.getState(), 'started')
  })
})
```

## Error codes

| Code              | Description            |
|-------------------|------------------------|
| ORK1006           | Missing provider       |
| ORK1007           | Duplicate registration |
| ORK1008           | Unknown dependency     |
| ORK1009           | Cycle detected         |
| ORK1013/1014/1017 | Phase errors           |
| ORK1020/1021/1022 | Lifecycle errors       |

## Guidelines for agents

1. Follow existing patterns and structure
2. Keep determinism — document any tie-breaking
3. Follow TSDoc policy strictly
4. No new public APIs without compelling use case
5. All components extend `Adapter` with singleton pattern
6. Dependencies must be explicit
7. Async work in lifecycle hooks only
8. Strict types: no `any`, no `!`, prefer `readonly`
9. Update tests alongside code
10. Run all validation commands before completing

## Code of conduct

Be kind. Assume good intent. Discuss ideas, not people.

## Next steps

| Guide                     | Description      |
|---------------------------|------------------|
| [Overview](./overview.md) | Mental model     |
| [Tests](./tests.md)       | Testing guidance |

