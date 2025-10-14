# Start

This page helps you install Orkestrel Core and build a working mental model in minutes.

Prerequisites
- Node.js 18 or newer
- TypeScript 5+ recommended

Install
```bat
npm install @orkestrel/core
```

Quick try: single-file app
- Save this as `quickstart.ts`:
```ts
import { Container, Orchestrator, Adapter, createToken, register } from '@orkestrel/core'

// A simple component with start/stop hooks
class Service extends Adapter {
  protected async onStart() { console.log('Service -> started') }
  protected async onStop() { console.log('Service -> stopped') }
}

// A typed contract and a value
const TNum = createToken<number>('num')
const TService = createToken<Service>('service')

// Wire things in a container and orchestrate
const container = new Container()
container.set(TNum, 41)

const app = new Orchestrator(container)
await app.start([
  register(TService, { useFactory: () => new Service() }),
])

console.log('Computed:', container.resolve(TNum) + 1)

await app.stop()
await app.destroy()
```
- Run it with Node + tsx:
```bat
npx tsx quickstart.ts
```

Hello tokens and container
```ts
import { Container, createToken } from '@orkestrel/core'

// 1) Define contracts as tokens
const A = createToken<number>('A')
const B = createToken<string>('B')
const OUT = createToken<{ a: number, b: string }>('OUT')

// 2) Register providers and resolve
const c = new Container()
c.set(A, 1)
c.set(B, 'two')
c.register(OUT, { useFactory: ({ a, b }) => ({ a, b }), inject: { a: A, b: B } })

const merged = c.resolve(OUT) // { a: 1, b: 'two' }
```

Lifecycle and Adapter
```ts
import { Adapter, createToken, Container } from '@orkestrel/core'

class Cache extends Adapter {
  private map = new Map<string, string>()
  protected async onStart() { this.map.set('ready', 'ok') }
  protected async onStop() { this.map.clear() }
}

const CacheTok = createToken<Cache>('Cache')
const c = new Container()
c.register(CacheTok, { useFactory: () => new Cache() })
const cache = c.resolve(CacheTok)
await cache.start()
await cache.stop()
await c.destroy() // ensures components are stopped/destroyed deterministically
```

Orchestrator quickstart
```ts
import { Orchestrator, Container, Adapter, createToken, register } from '@orkestrel/core'

class A extends Adapter {}
class B extends Adapter {}
const TA = createToken<A>('A')
const TB = createToken<B>('B')

const c = new Container()
const app = new Orchestrator(c)
await app.start([
  register(TA, { useFactory: () => new A() }),
  register(TB, { useFactory: () => new B() }, { dependencies: [TA] }),
])
await app.stop()
await app.destroy()
```

Ports: naming common contracts
```ts
import { createPortTokens, createPortToken, Container } from '@orkestrel/core'

// Bulk
const ports = createPortTokens({ logger: undefined as { info(msg: string): void } })
const c = new Container(); c.set(ports.logger, { info: console.log })
c.resolve(ports.logger).info('hello')

// Single
const HttpPort = createPortToken<{ get(url: string): Promise<string> }>('http')
```

Rules of the road
- Providers are synchronous: useValue must not be a Promise; useFactory must not be async and must not return a Promise. Move async work into lifecycle hooks (onStart/onStop/onDestroy).
- Inject dependencies via tuple `[A, B]` or object `{ a: A, b: B }`, or accept the `Container` directly.
- Prefer `Adapter` subclasses for long-lived components.

What next
- Concepts: deeper dive into tokens, providers, lifecycle, orchestrator
- Core: built-in adapters and runtime bits you can swap out
- Examples: more snippets and patterns
- Tips: provider patterns and gotchas
- Tests: how to test components and flows
- FAQ: quick answers from simple to advanced scenarios
