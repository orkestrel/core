# Concepts

<!-- Template: Core concepts explained in depth -->

This guide explains the core concepts: tokens, adapters, the container, lifecycle, and the orchestrator.

## Tokens

Tokens are typed symbols used as keys for registration and resolution:

```ts
import { createToken } from '@orkestrel/core'

// Create a token with a type parameter
const NumberToken = createToken<number>('config:port')

// Create multiple tokens from a shape
import { createPortTokens } from '@orkestrel/core'
const ports = createPortTokens({
  logger: undefined as { info(msg: string): void },
  config: undefined as { port: number },
})
// ports.logger is Token<{ info(msg: string): void }>
```

## Adapters

All components extend the `Adapter` base class:

```ts
import { Adapter } from '@orkestrel/core'

class MyService extends Adapter {
  // Lifecycle hooks (override as needed)
  protected async onCreate() {}
  protected async onStart() {}
  protected async onStop() {}
  protected async onDestroy() {}
}
```

### Singleton pattern

Each Adapter subclass maintains its own singleton:

```ts
// Get or create the singleton
const instance = MyService.getInstance()

// Lifecycle via static methods
await MyService.start()     // created → started
await MyService.stop()      // started → stopped
await MyService.destroy()   // stopped → destroyed

// Check state
console.log(MyService.getState()) // 'created' | 'started' | 'stopped' | 'destroyed'
```

### Lifecycle states

```
created → started → stopped → destroyed
```

## Container

The container registers and resolves Adapter classes:

```ts
import { ContainerAdapter, createToken, Adapter } from '@orkestrel/core'

class MyAdapter extends Adapter {}

const Token = createToken<MyAdapter>('MyAdapter')

const c = new ContainerAdapter()
c.register(Token, { adapter: MyAdapter })

// Resolution
const instance = c.resolve(Token)  // Throws if missing
const maybe = c.get(Token)         // Returns undefined if missing
```

### Scoping

Create child containers for isolated work:

```ts
// Create a child that inherits parent registrations
const child = container.createChild()

// Or use scoped work with auto-cleanup
await container.using(async (scope) => {
  scope.register(Token, { adapter: OverrideAdapter })
  // scope is destroyed after this function
})
```

### Cleanup

```ts
await container.destroy()
// Stops and destroys all registered Adapters
// Aggregates errors if any occur
```

## Orchestrator

The orchestrator manages lifecycle in dependency order:

```ts
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Database extends Adapter {}
class Cache extends Adapter {}
class Server extends Adapter {}

const DbToken = createToken<Database>('Database')
const CacheToken = createToken<Cache>('Cache')
const ServerToken = createToken<Server>('Server')

const app = new OrchestratorAdapter(new ContainerAdapter())

await app.start({
  [DbToken]: { adapter: Database },
  [CacheToken]: { adapter: Cache, dependencies: [DbToken] },
  [ServerToken]: { adapter: Server, dependencies: [CacheToken] },
})

// Start order: Database → Cache → Server
// Stop order: Server → Cache → Database
```

### Dependency handling

- **Explicit declaration**: `dependencies: [TokenA, TokenB]`
- **Cycle detection**: Throws ORK1009 if circular dependencies exist
- **Unknown deps**: Throws ORK1008 if a dependency token isn't registered

### Rollback on failure

If a component fails to start, already-started components are stopped in reverse order.

### Timeouts

```ts
// Per-orchestrator defaults
const app = new OrchestratorAdapter(container, { 
  timeouts: 5000 // All phases
})

// Per-component overrides
{
  [Token]: { 
    adapter: SlowService,
    timeouts: { onStart: 10000, onStop: 5000 }
  }
}
```

## Global helpers

Convenience functions for common patterns:

```ts
import { container, orchestrator } from '@orkestrel/core'

// Access default container
container().register(Token, { adapter: MyAdapter })

// Access named container
container('tenant-1').register(Token, { adapter: TenantAdapter })

// Run scoped work
await container.using(async (scope) => {
  // Scoped registrations
})
```

## Error codes

| Code    | Description                  |
|---------|------------------------------|
| ORK1005 | Container already destroyed  |
| ORK1006 | Missing provider             |
| ORK1007 | Duplicate registration       |
| ORK1008 | Unknown dependency           |
| ORK1009 | Cycle detected               |
| ORK1013 | Start phase errors           |
| ORK1014 | Stop phase errors            |
| ORK1017 | Destroy phase errors         |
| ORK1020 | Invalid lifecycle transition |
| ORK1021 | Hook timed out               |
| ORK1022 | Hook failed                  |

## Next steps

| Guide                     | Description                  |
|---------------------------|------------------------------|
| [Core](./core.md)         | Built-in adapters            |
| [Examples](./examples.md) | Copy-pasteable patterns      |
| [Tips](./tips.md)         | Patterns and troubleshooting |

