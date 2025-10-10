# Orkestrel Core

Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire implementations via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

- Package: `@orkestrel/core`
- TypeScript-first, ESM-only
- Works in Node and the browser
- Requires Node 18+

## Install
```
npm install @orkestrel/core
```

## Quickstart
Define a port, register an implementation, start, use, and clean up.

```ts
import { createPortTokens, orchestrator, register, container } from '@orkestrel/core'

interface EmailPort { send(to: string, subject: string, body: string): Promise<void> }
const Ports = createPortTokens({ email: {} as EmailPort })

class ConsoleEmail implements EmailPort {
  async send(to: string, subject: string, body: string) {
    console.log('[email]', { to, subject, body })
  }
}

await orchestrator().start([
  register(Ports.email, { useFactory: () => new ConsoleEmail() }),
])

await container().resolve(Ports.email).send('me@example.com', 'Hi', 'Welcome!')

// Single-call shutdown: stop/destroy as needed
await orchestrator().destroy()
```

## Concepts (at a glance)
- Ports & Tokens: describe capabilities (Email, Logger, etc.) via tokens created with `createPortToken(s)`.
- Container: tiny DI to register value/factory/class providers and resolve by token; supports child scopes via `using()`.
- Orchestrator: registers components, validates dependencies, and runs lifecycles in layers with timeouts; includes a helper `register()` to build entries.
- Adapters (in-memory): Layer, Queue, Emitter, Event, Registry, Diagnostic, Logger.

## Public API (selected)
- Tokens: `createPortToken`, `createPortTokens`, `extendPorts`
- Container: `Container` class, `container()` global getter (with `.resolve`, `.get`, `.using`, etc.)
- Orchestrator: `Orchestrator` class, `orchestrator()` global getter (with `.start()`, `.stop()`, `.destroy()`)
- Helper: `register(token, provider, options)` for typed registrations
- Built-ins: `LayerAdapter`, `QueueAdapter`, `EmitterAdapter`, `EventAdapter`, `RegistryAdapter`, `DiagnosticAdapter`, `LoggerAdapter`

Notes
- Providers are synchronous only (no async factories or Promise values). Put async work in `Lifecycle` hooks if you build lifecycle-owning components.
- Deterministic order: dependencies are validated; start/stop/destroy run in computed layers.
- Types are strict; surfaces are small and composable.

## Develop locally
```
npm run check    // typecheck
npm run format   // lint + autofix
npm test         // unit tests
npm run build    // build ESM + types
```

Publishing
- `prepublishOnly` runs the same gates (check, format, test, docs, build) so only `dist` is shipped.

Issues
- https://github.com/orkestrel/core/issues
