# Start

<!-- Template: Quick installation and tour -->

Get started with @orkestrel/core in minutes.

## Requirements

- Node.js 20+
- TypeScript 5.0+ (recommended)

## Installation

```sh
npm install @orkestrel/core
```

## Quick example

Save as `app.ts`:

```ts
import { ContainerAdapter, OrchestratorAdapter, Adapter, createToken } from '@orkestrel/core'

// Define a component with lifecycle hooks
class Service extends Adapter {
  protected async onStart() { console.log('Service started') }
  protected async onStop() { console.log('Service stopped') }
}

// Create a typed token
const ServiceToken = createToken<Service>('Service')

// Wire and orchestrate
const container = new ContainerAdapter()
const app = new OrchestratorAdapter(container)

await app.start({
  [ServiceToken]: { adapter: Service },
})

console.log('Service state:', Service.getState()) // 'started'

await app.destroy()
```

Run with:

```sh
npx tsx app.ts
```

## Token basics

Tokens are typed symbols that serve as keys for registration and resolution:

```ts
import { createToken, ContainerAdapter, Adapter } from '@orkestrel/core'

class MyAdapter extends Adapter {
  getValue() { return 42 }
}

const Token = createToken<MyAdapter>('MyAdapter')

const c = new ContainerAdapter()
c.register(Token, { adapter: MyAdapter })

const instance = c.resolve(Token)
console.log(instance.getValue()) // 42
```

## Adapter lifecycle

All components extend `Adapter` and use the singleton pattern:

```ts
import { Adapter } from '@orkestrel/core'

class Cache extends Adapter {
  #data = new Map<string, string>()
  
  protected async onStart() {
    this.#data.set('status', 'ready')
  }
  
  protected async onStop() {
    this.#data.clear()
  }
  
  get(key: string) { return this.#data.get(key) }
}

// Lifecycle via static methods
await Cache.start()
console.log(Cache.getState()) // 'started'

const cache = Cache.getInstance()
console.log(cache.get('status')) // 'ready'

await Cache.destroy()
```

## Orchestrating dependencies

Declare dependencies for proper ordering:

```ts
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Database extends Adapter {}
class Server extends Adapter {}

const DbToken = createToken<Database>('Database')
const ServerToken = createToken<Server>('Server')

const app = new OrchestratorAdapter(new ContainerAdapter())

await app.start({
  [DbToken]: { adapter: Database },
  [ServerToken]: { adapter: Server, dependencies: [DbToken] },
})

// Database starts first, then Server
// On destroy: Server stops first, then Database

await app.destroy()
```

## Key rules

1. All components extend `Adapter`
2. Each subclass maintains its own singleton via static methods
3. Use `MyAdapter.start()`, `MyAdapter.stop()`, `MyAdapter.destroy()` for lifecycle
4. Container registers Adapter classes: `{ adapter: MyAdapterClass }`
5. Move async work into lifecycle hooks (`onStart`, `onStop`, `onDestroy`)
6. Specify dependencies explicitly: `dependencies: [TokenA, TokenB]`

## Next steps

| Guide                     | Description                                |
|---------------------------|--------------------------------------------|
| [Concepts](./concepts.md) | Deep dive into tokens, adapters, lifecycle |
| [Core](./core.md)         | Built-in adapters                          |
| [Examples](./examples.md) | More patterns                              |

