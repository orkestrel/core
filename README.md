# @orkestrel/core

<!-- Package-specific section: Package name and tagline -->
Minimal, strongly-typed adapter/port toolkit for TypeScript. Compose capabilities with tokens, wire Adapter classes via a tiny DI container, and drive lifecycles deterministically with an orchestrator.

<!-- Template section: Badges (customize URLs for each package) -->
[![npm](https://img.shields.io/npm/v/@orkestrel/core)](https://www.npmjs.com/package/@orkestrel/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

<!-- Template section: Key features (customize per package) -->
## Features

- **Tokens and ports** — Typed symbols for decoupled contracts
- **Dependency injection** — Minimal container with singleton adapters
- **Deterministic lifecycle** — Start, stop, destroy with timeouts and rollback
- **Orchestration** — Topological ordering with per-layer concurrency
- **Built-in adapters** — Logger, diagnostics, emitter, event bus, queue, registry
- **Zero dependencies** — No external runtime dependencies
- **Strict TypeScript** — Full `exactOptionalPropertyTypes` support

<!-- Template section: Requirements -->
## Requirements

- Node.js 20+
- TypeScript 5.0+ (recommended)
- ESM-only (`"type": "module"`)

<!-- Template section: Installation -->
## Installation

```sh
npm install @orkestrel/core
```

<!-- Package-specific section: Quick start example -->
## Quick Start

```ts
import { ContainerAdapter, OrchestratorAdapter, Adapter, createToken } from '@orkestrel/core'

// Define components as Adapter subclasses
class Database extends Adapter {
  protected override async onStart() { console.log('Database connected') }
  protected override async onStop() { console.log('Database disconnected') }
}

class Server extends Adapter {
  protected override async onStart() { console.log('Server started') }
  protected override async onStop() { console.log('Server stopped') }
}

// Create typed tokens
const DbToken = createToken<Database>('Database')
const ServerToken = createToken<Server>('Server')

// Wire via container and orchestrate
const container = new ContainerAdapter()
const app = new OrchestratorAdapter(container)

await app.start({
  [DbToken]: { adapter: Database },
  [ServerToken]: { adapter: Server, dependencies: [DbToken] },
})

// Server depends on Database - started in correct order
await app.destroy() // Cleanup in reverse order
```

<!-- Package-specific section: Subscription pattern -->
## Event Subscriptions

Event subscriptions return an `Unsubscribe` function for cleanup:

```ts
// Subscribe to lifecycle events
const unsubscribe = MyAdapter.on('transition', (state) => {
  console.log('New state:', state)
})

// Later: cleanup
unsubscribe()
```

<!-- Package-specific section: Core concepts summary -->
## Core Concepts

| Concept | Description |
|---------|-------------|
| **Token** | Typed symbol key for registration and resolution |
| **Adapter** | Base class with singleton pattern and lifecycle hooks |
| **Container** | DI container that registers and resolves Adapter classes |
| **Orchestrator** | Manages start/stop/destroy in dependency order |

## API Reference

### Adapters

| Adapter | Purpose |
|---------|---------|
| `Adapter` | Base class with lifecycle hooks (onCreate, onStart, onStop, onDestroy) |
| `ContainerAdapter` | DI container for registering and resolving adapters |
| `OrchestratorAdapter` | Lifecycle orchestration with dependency ordering |
| `EmitterAdapter` | Typed synchronous event emission |
| `EventAdapter` | Async topic-based publish/subscribe |
| `QueueAdapter` | Task queue with concurrency control |
| `RegistryAdapter` | Named singleton storage with locking |
| `LayerAdapter` | Topological layer computation |
| `LoggerAdapter` | Console-based structured logging |
| `DiagnosticAdapter` | Error handling, metrics, and telemetry |

### Interfaces

All behavioral interfaces use the `*Interface` suffix:

| Interface | Description |
|-----------|-------------|
| `LoggerInterface` | Structured logging (debug, info, warn, error) |
| `DiagnosticInterface` | Error reporting, metrics, telemetry |
| `EmitterInterface` | Typed synchronous event emission |
| `EventBusInterface` | Async topic-based pub/sub |
| `QueueInterface` | Task queue with concurrency control |
| `LayerInterface` | Topological layer computation |
| `RegistryInterface` | Named singleton storage |

### Factory Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createToken<T>(description)` | `Token<T>` | Create a typed token symbol |
| `createTokens(namespace, shape)` | `TokensOf<T>` | Create multiple tokens from a shape |

### Type Guards

| Guard | Description |
|-------|-------------|
| `isString(v)` | Check if value is a string |
| `isNumber(v)` | Check if value is a finite number |
| `isBoolean(v)` | Check if value is a boolean |
| `isFunction(v)` | Check if value is a function |
| `isRecord(v)` | Check if value is a plain object |
| `isError(v)` | Check if value is an Error instance |
| `isArray(v)` | Check if value is an array |
| `isLiteral(...values)` | Create a guard for literal values |
| `isArrayOf(guard)` | Create a guard for typed arrays |
| `isToken(v)` | Check if value is a token symbol |
| `isAdapterProvider(v)` | Check if value is an adapter provider |

### Error Classes

| Error | Code | Description |
|-------|------|-------------|
| `OrkestrelError` | - | Base error class |
| `NotFoundError` | ORK1006 | Token not found in container |
| `InvalidTransitionError` | ORK1020 | Invalid lifecycle state transition |
| `TimeoutError` | ORK1021 | Lifecycle hook timed out |
| `AggregateLifecycleError` | ORK1013/1014/1017 | Multiple lifecycle errors |
| `ContainerDestroyedError` | ORK1005 | Container already destroyed |
| `CircularDependencyError` | ORK1009 | Circular dependency detected |
| `DuplicateRegistrationError` | ORK1007 | Duplicate token registration |

<!-- Template section: Documentation links (customize URLs) -->
## Documentation

| Guide | Description |
|-------|-------------|
| [Core Guide](./guides/core.md) | Comprehensive API guide and reference |
| [Examples](./guides/examples.md) | Copy-pasteable patterns |
| [Migration](./guides/migration.md) | v1 → v2 upgrade guide |

<!-- Template section: Scripts -->
## Development

```sh
npm run check   # Typecheck
npm run test    # Run tests
npm run format  # Lint and fix
npm run build   # Build ESM + types
npm run show    # Build showcase
```

<!-- Template section: Links -->
## Links

- [Issues](https://github.com/orkestrel/core/issues)
- [Changelog](https://github.com/orkestrel/core/releases)

<!-- Template section: License -->
## License

MIT © 2025 Orkestrel

