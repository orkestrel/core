# Usage Examples: @orkestrel/core

Copy-pasteable examples for common use cases.

## Basic Adapter Definition

```typescript
import { Adapter } from '@orkestrel/core'

class HttpServer extends Adapter {
  #port = 3000

  protected async onStart() {
    console.log(`Server starting on port ${this.#port}`)
    // Start server logic
  }

  protected async onStop() {
    console.log('Server stopping')
    // Stop server logic
  }

  protected async onDestroy() {
    console.log('Server destroyed')
    // Cleanup resources
  }
}

// Use static methods for singleton lifecycle
await HttpServer.start()
console.log(HttpServer.getState()) // 'started'
await HttpServer.stop()
await HttpServer.destroy()
```

## Container Registration

```typescript
import { ContainerAdapter, createToken, Adapter } from '@orkestrel/core'

// Define adapters
class Database extends Adapter {
  async query(sql: string) { /* ... */ }
}

class UserService extends Adapter {
  #db: Database
  constructor(db: Database) {
    super()
    this.#db = db
  }
}

// Create tokens
const DbToken = createToken<Database>('Database')
const UserToken = createToken<UserService>('UserService')

// Register with container
const container = new ContainerAdapter()
container.register(DbToken, { adapter: Database })
container.register(UserToken, { adapter: UserService })

// Resolve singletons
const db = container.resolve(DbToken)
const users = container.resolve(UserToken)
```

## Orchestrator Lifecycle

```typescript
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Config extends Adapter {}
class Database extends Adapter {}
class Server extends Adapter {}

const ConfigToken = createToken<Config>('Config')
const DbToken = createToken<Database>('Database')
const ServerToken = createToken<Server>('Server')

const container = new ContainerAdapter()
const app = new OrchestratorAdapter(container)

// Start with dependency graph
await app.start({
  [ConfigToken]: { adapter: Config },
  [DbToken]: { adapter: Database, dependencies: [ConfigToken] },
  [ServerToken]: { adapter: Server, dependencies: [ConfigToken, DbToken] },
})

// Components started in order: Config → Database → Server
// Stopped/destroyed in reverse order

await app.destroy()
```

## Event Subscription Pattern

```typescript
import { Adapter } from '@orkestrel/core'

class MyAdapter extends Adapter {
  #cleanup: (() => void)[] = []

  protected async onStart() {
    // Subscribe to events
    const unsub1 = MyAdapter.on('transition', (state) => {
      console.log('State changed:', state)
    })

    const unsub2 = MyAdapter.on('error', (err) => {
      console.error('Error:', err)
    })

    // Store for cleanup
    this.#cleanup.push(unsub1, unsub2)
  }

  protected async onDestroy() {
    // Cleanup all subscriptions
    this.#cleanup.forEach(fn => fn())
  }
}
```

## Error Handling

```typescript
import { 
  OrchestratorAdapter, 
  ContainerAdapter, 
  Adapter, 
  createToken,
  isAggregateLifecycleError 
} from '@orkestrel/core'

class FailingAdapter extends Adapter {
  protected async onStart() {
    throw new Error('Startup failed')
  }
}

const Token = createToken<FailingAdapter>('Failing')
const container = new ContainerAdapter()
const app = new OrchestratorAdapter(container)

try {
  await app.start({
    [Token]: { adapter: FailingAdapter },
  })
} catch (err) {
  if (isAggregateLifecycleError(err)) {
    console.log('Code:', err.code) // 'ORK1013'
    console.log('Details:', err.details) // Array of LifecycleErrorDetail
  }
}
```

## Scoped Container

```typescript
import { ContainerAdapter, createToken, Adapter } from '@orkestrel/core'

class MockDatabase extends Adapter {}

const DbToken = createToken<Adapter>('Database')

const container = new ContainerAdapter()
container.register(DbToken, { adapter: class ProdDatabase extends Adapter {} })

// Run scoped work with automatic cleanup
await container.using(async (scope) => {
  // Override in scope
  scope.register(DbToken, { adapter: MockDatabase })
  
  const db = scope.resolve(DbToken)
  // db is MockDatabase
  
  // Scope destroyed automatically
})

// Original container unaffected
const db = container.resolve(DbToken)
// db is ProdDatabase
```

## Queue with Concurrency

```typescript
import { QueueAdapter } from '@orkestrel/core'

const queue = new QueueAdapter({ concurrency: 3 })

const tasks = [
  async () => { await fetch('/api/1'); return 1 },
  async () => { await fetch('/api/2'); return 2 },
  async () => { await fetch('/api/3'); return 3 },
  async () => { await fetch('/api/4'); return 4 },
]

// Run with concurrency limit and timeout
const results = await queue.run(tasks, {
  concurrency: 2,
  timeout: 5000,
})

console.log(results) // [1, 2, 3, 4]
```

## Registry Pattern

```typescript
import { RegistryAdapter } from '@orkestrel/core'

interface Config {
  apiUrl: string
  debug: boolean
}

const configRegistry = new RegistryAdapter<Config>({
  label: 'config',
  default: {
    value: { apiUrl: 'https://api.example.com', debug: false },
  },
})

// Get default
const config = configRegistry.resolve()

// Set named instance
configRegistry.set('test', { apiUrl: 'http://localhost', debug: true })

// Lock to prevent replacement
configRegistry.set('prod', { apiUrl: 'https://prod.example.com', debug: false }, true)

// List all names
console.log(configRegistry.list()) // ['test', 'prod']
```

## Diagnostic and Logging

```typescript
import { DiagnosticAdapter, LoggerAdapter } from '@orkestrel/core'
import type { DiagnosticMessage } from '@orkestrel/core'

const messages: readonly DiagnosticMessage[] = [
  { key: 'MY001', level: 'error', message: 'Custom error' },
  { key: 'my.event', level: 'info', message: 'Event occurred' },
]

const logger = new LoggerAdapter()
const diagnostic = new DiagnosticAdapter({ logger, messages })

// Log events
diagnostic.event('my.event', { user: 'alice' })

// Emit structured error
try {
  diagnostic.fail('MY001', { message: 'Something went wrong' })
} catch (err) {
  console.log(err.code) // 'MY001'
}

// Track metrics
diagnostic.metric('request.duration', 42, { path: '/api' })
```

## Typed Tokens

```typescript
import { createToken, createTokens } from '@orkestrel/core'

// Single token
const HttpToken = createToken<{ get(url: string): Promise<Response> }>('Http')

// Multiple tokens from shape
const Ports = createTokens('ports', {
  logger: {} as { log(msg: string): void },
  config: {} as { get(key: string): string },
})

// Ports.logger: Token<{ log(msg: string): void }>
// Ports.config: Token<{ get(key: string): string }>
```
