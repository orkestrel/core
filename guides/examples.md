# Examples

Lifecycle: simple adapter with singleton pattern
```ts
import { Adapter, createToken, Container } from '@orkestrel/core'

class Cache extends Adapter {
  static instance?: Cache
  ready = false
  protected async onStart() { this.ready = true }
  protected async onStop() { this.ready = false }
}

const CacheTok = createToken<Cache>('Cache')
const c = new Container()
c.register(CacheTok, { adapter: Cache })

// Using static methods
await Cache.start()
console.log(Cache.getState())  // 'started'

// Or resolve from container
const cache = c.resolve(CacheTok)
console.log(cache.state)  // 'started'

await Cache.stop()
await c.destroy()
```

Orchestrator: registration and start order
```ts
import { Orchestrator, Container, Adapter, createToken } from '@orkestrel/core'

class A extends Adapter {
  static instance?: A
}

class B extends Adapter {
  static instance?: B
}

const TA = createToken<A>('A')
const TB = createToken<B>('B')

const c = new Container()
c.register(TA, { adapter: A })
c.register(TB, { adapter: B, dependencies: [TA] })

const app = new Orchestrator(c)
await app.start()  // Starts in dependency order: A then B
await app.destroy()
```

Orchestrator: explicit dependencies
```ts
class ServiceA extends Adapter {
  static instance?: ServiceA
}

class ServiceB extends Adapter {
  static instance?: ServiceB
  // ServiceB depends on ServiceA
}

const TA = createToken<ServiceA>('A')
const TB = createToken<ServiceB>('B')

const c = new Container()
c.register(TA, { adapter: ServiceA })
c.register(TB, { adapter: ServiceB, dependencies: [TA] })

const app = new Orchestrator(c)
await app.start()
await app.destroy()
```

Orchestrator: per-registration timeouts
```ts
class SlowStart extends Adapter {
  static instance?: SlowStart
  protected async onStart() { 
    await new Promise(r => setTimeout(r, 100))
  }
}

const SLOW = createToken<SlowStart>('SLOW')
const c = new Container()
c.register(SLOW, { adapter: SlowStart, timeouts: { onStart: 10 } })

const app = new Orchestrator(c)
await app.start().catch(() => {
  // Aggregated error ORK1013 due to timeout
})
```

Orchestrator: tracer hooks
```ts
import { Orchestrator, Container } from '@orkestrel/core'

const phases = []
const app = new Orchestrator(new Container(), {
  tracer: {
    onLayers: ({ layers }) => console.log('layers', layers),
    onPhase: (p) => phases.push({
      phase: p.phase,
      layer: p.layer,
      outcomes: p.outcomes.map(o => ({ token: o.token, ok: o.ok })),
    }),
  },
})
// ... register and start
```

Ports: bulk and single tokens
```ts
import { createPortTokens, createPortToken, Container, Adapter } from '@orkestrel/core'

class Logger extends Adapter {
  static instance?: Logger
  info(msg: string) { console.log(msg) }
}

const ports = createPortTokens({ logger: undefined as Logger })
const c = new Container()
c.register(ports.logger, { adapter: Logger })
c.resolve(ports.logger).info('hi')

const Http = createPortToken<{ get(url: string): Promise<string> }>('http')
```

Global helpers
```ts
import { container, orchestrator, createToken, Adapter } from '@orkestrel/core'

class Service extends Adapter {
  static instance?: Service
}

// containers
const A = createToken<Service>('A')
container().register(A, { adapter: Service })
const v = container.resolve(A)  // Service singleton instance
await container.using(async (scope) => { 
  // Register scoped overrides
})

// orchestrators
const app = orchestrator()
await app.container.using(scope => {/* register */})
```

Container: scoped overrides with using
```ts
class Counter extends Adapter {
  static instance?: Counter
  count = 0
}

const A = createToken<Counter>('A')
const root = new Container()
root.register(A, { adapter: Counter })

const out = await root.using(async (scope) => {
  // Scope inherits parent registrations but can override
  class ScopedCounter extends Adapter {
    static instance?: ScopedCounter
    count = 41
  }
  scope.register(A, { adapter: ScopedCounter as any })
  return scope.resolve(A).count + 1
})
// out === 42
// after using(), the child scope is destroyed and root remains unchanged
```

See also
- Overview and Start for the mental model and installation
- Concepts for tokens/adapters/lifecycle/orchestration
- Core for built-in adapters
- Tips for patterns and troubleshooting
- Tests for fast, deterministic testing guidance
- FAQ for quick answers from simple to advanced scenarios

API reference is generated separately; see docs/api/index.md (Typedoc).
