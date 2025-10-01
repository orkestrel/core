# Examples

This repository includes two runnable examples to illustrate both a simple and a larger composition.

## Simple (single-file)
- Path: [examples/simple.ts](../examples/simple.ts)
- Shows how to define a small port, register a provider, use the helpers, and run lifecycle.
- Uses the auto-registered default container/orchestrator via `container()`/`orchestrator()`.
- Demonstrates strict resolution with `resolve(token)`.

Run:
```sh
npm run example:simple
```

## Large (multi-file)
- Entry: [examples/large/app.ts](../examples/large/app.ts)
- Ports: [examples/large/infra/ports.ts](../examples/large/infra/ports.ts)
- Feature file: [examples/large/modules/user.ts](../examples/large/modules/user.ts)

Highlights
- Uses `container()`/`orchestrator()` helpers with auto-registered defaults (named instances optional).
- Registers infra providers (config, clock, logger, email) in the app entry.
- Wires a `user` feature in a separate file with explicit dependencies.
- Demonstrates lifecycle start/stop/destroy and cross-file usage via helpers.
- Shows resolving multiple tokens at once with `container().resolve({ ... })`.

Run:
```sh
npm run example:large
```

## Additional snippets

Named instance map resolution:
```ts
import { container, createPortTokens, Container } from '@orkestrel/core'

interface A { /* ... */ }
interface B { /* ... */ }
const Ports = createPortTokens({ a: {} as A, b: {} as B })

// Create and register a named container
const tenant = new Container()
container.set('tenant:A', tenant)

// Resolve multiple tokens at once from the named instance
const { a, b } = container('tenant:A').resolve({ a: Ports.a, b: Ports.b })
```

Optional multi-resolution with get:
```ts
import { container, createPortTokens } from '@orkestrel/core'

interface Email { /* ... */ }
interface Unknown { /* ... */ }
const Ports = createPortTokens({ email: {} as Email, unknown: {} as Unknown })

// Returns { email: Email | undefined, unknown: Unknown | undefined }
const maybe = container().get({ email: Ports.email, unknown: Ports.unknown })
if (!maybe.unknown) {
  // handle missing dependency gracefully
}
```

See also
- Composition patterns: [docs/patterns.md](./patterns.md)
