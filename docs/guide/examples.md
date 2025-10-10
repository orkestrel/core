# Examples

Container: resolve a map and a tuple
```ts
import { Container, createToken } from '@orkestrel/core'

const A = createToken<number>('A')
const B = createToken<string>('B')
const C = createToken<boolean>('C')

const c = new Container()
c.set(A, 1)
c.set(B, 'two')
c.set(C, true)

// map
const { a, b, c: cval } = c.resolve({ a: A, b: B, c: C })
// tuple
const [aa, bb] = c.resolve([A, B] as const)
```

Container: scoped overrides with using
```ts
const A = createToken<number>('A')
const root = new Container()
root.set(A, 7)

const out = await root.using(async (scope) => {
  scope.set(A, 41)
  return scope.resolve(A) + 1
})
// out === 43
// after using(), the child scope is destroyed and root remains unchanged
```

Lifecycle: simple adapter
```ts
import { Adapter, createToken, Container } from '@orkestrel/core'

class Cache extends Adapter {
  ready = false
  protected async onStart() { this.ready = true }
  protected async onStop() { this.ready = false }
}

const CacheTok = createToken<Cache>('Cache')
const c = new Container()
c.register(CacheTok, { useFactory: () => new Cache() })
const cache = c.resolve(CacheTok)
await cache.start()
await cache.stop()
await c.destroy()
```

Orchestrator: register helper and start order
```ts
import { Orchestrator, Container, Adapter, createToken, register } from '@orkestrel/core'

class A extends Adapter {}
class B extends Adapter {}
const TA = createToken<A>('A')
const TB = createToken<B>('B')

const app = new Orchestrator(new Container())
await app.start([
  register(TA, { useFactory: () => new A() }),
  register(TB, { useFactory: () => new B() }, { dependencies: [TA] }),
])
await app.destroy()
```

Orchestrator: infer dependencies from inject
```ts
class NeedsPorts extends Adapter { constructor(public a: A, public b: B) { super() } }
const TA = createToken<A>('A')
const TB = createToken<B>('B')
const TNeeds = createToken<NeedsPorts>('Needs')
const app = new Orchestrator(new Container())
await app.start([
  register(TA, { useFactory: () => new A() }),
  register(TB, { useFactory: () => new B() }),
  // dependencies omitted; inferred from tuple inject
  register(TNeeds, { useClass: NeedsPorts, inject: [TA, TB] }),
])
await app.destroy()
```

Orchestrator: per-registration timeouts
```ts
class SlowStart extends Adapter { constructor(private ms: number) { super() } protected async onStart() { await new Promise(r => setTimeout(r, this.ms)) } }
const SLOW = createToken<SlowStart>('SLOW')
const app = new Orchestrator(new Container())
await app.start([
  register(SLOW, { useFactory: () => new SlowStart(100) }, { timeouts: { onStart: 10 } }),
]).catch(() => {/* aggregated error ORK1013 */})
```

Orchestrator: tracer hooks
```ts
const phases: Array<{ phase: 'start'|'stop'|'destroy', layer: number, outcomes: { token: string, ok: boolean }[] }> = []
const app = new Orchestrator(new Container(), {
  tracer: {
    onLayers: ({ layers }) => console.log('layers', layers),
    onPhase: (p) => phases.push({ phase: p.phase, layer: p.layer, outcomes: p.outcomes.map(o => ({ token: o.token, ok: o.ok })) }),
  },
})
// ... register and start
```

Ports: bulk and single tokens
```ts
import { createPortTokens, createPortToken, Container } from '@orkestrel/core'

const ports = createPortTokens({ logger: undefined as { info(msg: string): void } })
const c = new Container()
c.set(ports.logger, { info: console.log })
c.resolve(ports.logger).info('hi')

const Http = createPortToken<{ get(url: string): Promise<string> }>('http')
```

Global helpers
```ts
import { container, orchestrator, createToken } from '@orkestrel/core'

// containers
const A = createToken<number>('A')
container().set(A, 7)
const v = container.resolve(A) // 7
await container.using(async (scope) => { scope.set(A, 1) })

// orchestrators
const app = orchestrator()
await app.container.using(scope => {/* register */})
```
