# Examples

<!-- Template: Copy-pasteable code patterns -->

Practical examples for common use cases.

## Basic adapter

```ts
import { Adapter, createToken, ContainerAdapter } from '@orkestrel/core'

class Cache extends Adapter {
  #ready = false
  
  protected async onStart() { this.#ready = true }
  protected async onStop() { this.#ready = false }
  
  isReady() { return this.#ready }
}

const CacheToken = createToken<Cache>('Cache')
const container = new ContainerAdapter()
container.register(CacheToken, { adapter: Cache })

await Cache.start()
const cache = container.resolve(CacheToken)
console.log(cache.isReady()) // true

await container.destroy()
```

## Orchestrator with dependencies

```ts
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Database extends Adapter {
  protected async onStart() { console.log('DB connected') }
  protected async onStop() { console.log('DB disconnected') }
}

class Server extends Adapter {
  protected async onStart() { console.log('Server started') }
  protected async onStop() { console.log('Server stopped') }
}

const DbToken = createToken<Database>('Database')
const ServerToken = createToken<Server>('Server')

const app = new OrchestratorAdapter(new ContainerAdapter())

await app.start({
  [DbToken]: { adapter: Database },
  [ServerToken]: { adapter: Server, dependencies: [DbToken] },
})

// Output:
// DB connected
// Server started

await app.destroy()

// Output:
// Server stopped
// DB disconnected
```

## Per-component timeouts

```ts
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class SlowService extends Adapter {
  protected async onStart() {
    await new Promise(r => setTimeout(r, 100))
  }
}

const SlowToken = createToken<SlowService>('SlowService')

const app = new OrchestratorAdapter(new ContainerAdapter())

await app.start({
  [SlowToken]: { 
    adapter: SlowService, 
    timeouts: { onStart: 10 } // Will timeout
  },
}).catch(err => {
  console.log('Start failed:', err.code) // ORK1013
})

await app.destroy()
```

## Tracer hooks

```ts
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Service extends Adapter {}
const Token = createToken<Service>('Service')

const phases: unknown[] = []

const app = new OrchestratorAdapter(new ContainerAdapter(), {
  tracer: {
    onLayers: ({ layers }) => console.log('Layers:', layers),
    onPhase: (p) => phases.push({
      phase: p.phase,
      layer: p.layer,
      outcomes: p.outcomes.map(o => ({ token: o.token, ok: o.ok })),
    }),
  },
})

await app.start({ [Token]: { adapter: Service } })
await app.destroy()

console.log(phases)
```

## Port tokens

```ts
import { createPortTokens, createPortToken, ContainerAdapter, Adapter } from '@orkestrel/core'

// Define multiple ports at once
const ports = createPortTokens({
  logger: undefined as { info(msg: string): void },
  config: undefined as { port: number },
})

// Or create single ports
const HttpPort = createPortToken<{ get(url: string): Promise<string> }>('http')

// Usage
class Logger extends Adapter {
  info(msg: string) { console.log(msg) }
}

const container = new ContainerAdapter()
container.register(ports.logger, { adapter: Logger })
container.resolve(ports.logger).info('hello')
```

## Global helpers

```ts
import { container, orchestrator, createToken, Adapter } from '@orkestrel/core'

class Service extends Adapter {}
const Token = createToken<Service>('Service')

// Register in default container
container().register(Token, { adapter: Service })

// Resolve from default container
const svc = container.resolve(Token)

// Scoped work
await container.using(async (scope) => {
  // Override in child scope
  class Override extends Adapter {}
  scope.register(Token, { adapter: Override })
  const override = scope.resolve(Token)
})
// Child destroyed, parent unchanged
```

## Scoped overrides

```ts
import { ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Counter extends Adapter {
  count = 0
}

const Token = createToken<Counter>('Counter')
const root = new ContainerAdapter()
root.register(Token, { adapter: Counter })

// Two-callback pattern: setup then run
const result = await root.using(
  (scope) => {
    class MockCounter extends Adapter { count = 99 }
    scope.register(Token, { adapter: MockCounter })
  },
  (scope) => {
    return scope.resolve(Token).count
  }
)

console.log(result) // 99
console.log(root.resolve(Token).count) // 0
```

## Error handling

```ts
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken, isAggregateLifecycleError } from '@orkestrel/core'

class FailingService extends Adapter {
  protected async onStart() {
    throw new Error('failed')
  }
}

const Token = createToken<FailingService>('Failing')
const app = new OrchestratorAdapter(new ContainerAdapter())

try {
  await app.start({ [Token]: { adapter: FailingService } })
} catch (err) {
  if (isAggregateLifecycleError(err)) {
    for (const detail of err.details) {
      console.log(`${detail.tokenDescription} failed during ${detail.phase}`)
      console.log(`  Timed out: ${detail.timedOut}`)
      console.log(`  Duration: ${detail.durationMs}ms`)
      console.log(`  Error: ${detail.error.message}`)
    }
  }
}

await app.destroy()
```

## Next steps

| Guide               | Description                  |
|---------------------|------------------------------|
| [Tips](./tips.md)   | Patterns and troubleshooting |
| [Tests](./tests.md) | Testing guidance             |
| [FAQ](./faq.md)     | Common questions             |

