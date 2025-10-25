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
import { Container, Orchestrator, Adapter, createToken } from '@orkestrel/core'

// A simple component with start/stop hooks
class Service extends Adapter {
  static instance?: Service
  protected async onStart() { console.log('Service -> started') }
  protected async onStop() { console.log('Service -> stopped') }
}

// A typed contract
const TService = createToken<Service>('service')

// Wire things in a container and orchestrate
const container = new Container()
container.register(TService, { adapter: Service })

const app = new Orchestrator(container)
await app.start()

const service = container.resolve(TService)
console.log('Service state:', service.state)

await app.stop()
await app.destroy()
```
- Run it with Node + tsx:
```bat
npx tsx quickstart.ts
```

Hello tokens and container with Adapters
```ts
import { Container, Adapter, createToken } from '@orkestrel/core'

// 1) Define components as Adapter subclasses
class ServiceA extends Adapter {
  static instance?: ServiceA
  getValue() { return 42 }
}

class ServiceB extends Adapter {
  static instance?: ServiceB
  getMessage() { return 'hello' }
}

// 2) Define contracts as tokens
const A = createToken<ServiceA>('A')
const B = createToken<ServiceB>('B')

// 3) Register adapters and resolve singletons
const c = new Container()
c.register(A, { adapter: ServiceA })
c.register(B, { adapter: ServiceB })

const a = c.resolve(A)  // Gets ServiceA singleton
const b = c.resolve(B)  // Gets ServiceB singleton
console.log(a.getValue(), b.getMessage())  // 42 hello
```

Lifecycle and Adapter
```ts
import { Adapter, createToken, Container } from '@orkestrel/core'

class Cache extends Adapter {
  static instance?: Cache
  private map = new Map<string, string>()
  
  protected async onStart() { 
    this.map.set('ready', 'ok')
    console.log('Cache started')
  }
  
  protected async onStop() { 
    this.map.clear()
    console.log('Cache stopped')
  }
}

const CacheTok = createToken<Cache>('Cache')
const c = new Container()
c.register(CacheTok, { adapter: Cache })

// Adapter uses singleton pattern - static methods
await Cache.start()
console.log(Cache.getState())  // 'started'

const cache = c.resolve(CacheTok)
console.log(cache.state)  // 'started'

await Cache.stop()
await c.destroy() // ensures components are stopped/destroyed deterministically
```

Orchestrator quickstart
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
await app.stop()   // Stops in reverse order: B then A
await app.destroy()
```

Ports: naming common contracts
```ts
import { createPortTokens, createPortToken, Container, Adapter } from '@orkestrel/core'

// Define a logger adapter
class LoggerAdapter extends Adapter {
  static instance?: LoggerAdapter
  info(msg: string) { console.log(msg) }
}

// Bulk tokens
const ports = createPortTokens({ 
  logger: undefined as LoggerAdapter 
})

const c = new Container()
c.register(ports.logger, { adapter: LoggerAdapter })
c.resolve(ports.logger).info('hello')

// Single token
const HttpPort = createPortToken<{ get(url: string): Promise<string> }>('http')
```

Rules of the road
- All components must extend `Adapter` and use the singleton pattern
- Each Adapter subclass maintains its own singleton instance via `static instance`
- Use static methods for lifecycle: `MyAdapter.start()`, `MyAdapter.stop()`, `MyAdapter.destroy()`
- Container registers Adapter classes: `container.register(token, { adapter: MyAdapterClass })`
- Move async work into lifecycle hooks (onStart/onStop/onDestroy)
- Dependencies are specified explicitly via `dependencies: [TokenA, TokenB]`

What next
- Concepts: deeper dive into tokens, adapters, lifecycle, orchestrator
- Core: built-in adapters and runtime bits you can swap out
- Examples: more snippets and patterns
- Tips: adapter patterns and gotchas
- Tests: how to test components and flows
- FAQ: quick answers from simple to advanced scenarios
