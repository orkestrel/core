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
  protected async onStart() { console.log('Database connected') }
  protected async onStop() { console.log('Database disconnected') }
}

class Server extends Adapter {
  protected async onStart() { console.log('Server started') }
  protected async onStop() { console.log('Server stopped') }
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

## Interfaces

All behavioral interfaces use the `*Interface` suffix:

| Interface | Description |
|-----------|-------------|
| `LoggerInterface` | Structured logging |
| `DiagnosticInterface` | Error reporting, metrics, telemetry |
| `EmitterInterface` | Typed synchronous event emission |
| `EventBusInterface` | Async topic-based pub/sub |
| `QueueInterface` | Task queue with concurrency control |
| `LayerInterface` | Topological layer computation |
| `RegistryInterface` | Named singleton storage |

<!-- Template section: Documentation links (customize URLs) -->
## Documentation

| Guide | Description |
|-------|-------------|
| [Examples](./guides/examples.md) | Copy-pasteable patterns |
| [Migration](./guides/migration.md) | v1 → v2 upgrade guide |
| [Core](./guides/core.md) | Built-in adapters and runtime |

<!-- Template section: Scripts -->
## Development

```sh
npm run check   # Typecheck
npm run test    # Run tests
npm run format  # Lint and fix
npm run build   # Build ESM + types
```

<!-- Template section: Links -->
## Links

- [Issues](https://github.com/orkestrel/core/issues)
- [Changelog](https://github.com/orkestrel/core/releases)

<!-- Template section: License -->
## License

MIT © 2025 Orkestrel

