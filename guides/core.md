# @orkestrel/core API Guide

> **A minimal, strongly-typed adapter/port toolkit for TypeScript**

This guide provides comprehensive documentation for all features, APIs, and usage patterns of the `@orkestrel/core` library.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Adapter Lifecycle](#adapter-lifecycle)
6. [Container (Dependency Injection)](#container-dependency-injection)
7. [Orchestrator](#orchestrator)
8. [Emitter (Typed Events)](#emitter-typed-events)
9. [EventBus (Async Pub/Sub)](#eventbus-async-pubsub)
10. [Queue (Task Execution)](#queue-task-execution)
11. [Registry (Named Singletons)](#registry-named-singletons)
12. [Layer (Topological Sort)](#layer-topological-sort)
13. [Logger](#logger)
14. [Diagnostic](#diagnostic)
15. [Error Handling](#error-handling)
16. [Type Guards](#type-guards)
17. [TypeScript Integration](#typescript-integration)
18. [API Reference](#api-reference)

---

## Introduction

This library provides a minimal, strongly-typed adapter/port toolkit for TypeScript applications. Developers get:

- **Singleton adapters**: Lifecycle-managed components with hooks
- **Dependency injection**: Minimal container for wiring adapters
- **Orchestration**: Start/stop/destroy in topological dependency order
- **Typed events**: Synchronous and async event emission
- **Zero dependencies**: Built entirely on native APIs

### Value Proposition

| Traditional Approach | @orkestrel/core |
|---------------------|-----------------|
| Manual singleton management | Static methods with lifecycle hooks |
| Implicit dependency order | Topological ordering with concurrency |
| Inconsistent cleanup | Deterministic destroy in reverse order |
| No type safety for events | Fully typed event maps |
| Complex DI containers | Minimal container with tokens |

---

## Installation

```bash
npm install @orkestrel/core
```

---

## Quick Start

```typescript
import { Adapter, ContainerAdapter, OrchestratorAdapter, createToken } from '@orkestrel/core'

// 1. Define components as Adapter subclasses
class Database extends Adapter {
	protected async onStart() {
		console.log('Database connected')
	}
	protected async onStop() {
		console.log('Database disconnected')
	}
}

class Server extends Adapter {
	protected async onStart() {
		console.log('Server started')
	}
	protected async onStop() {
		console.log('Server stopped')
	}
}

// 2. Create typed tokens
const DbToken = createToken<Database>('Database')
const ServerToken = createToken<Server>('Server')

// 3. Wire via container and orchestrate
const container = new ContainerAdapter()
const app = new OrchestratorAdapter(container)

await app.start({
	[DbToken]: { adapter: Database },
	[ServerToken]: { adapter: Server, dependencies: [DbToken] },
})

// Output:
// Database connected
// Server started

// 4. Cleanup in reverse dependency order
await app.destroy()

// Output:
// Server stopped
// Database disconnected
```

---

## Core Concepts

### Tokens

Tokens are typed symbols used as keys for registration and resolution:

```typescript
import { createToken, createTokens } from '@orkestrel/core'

// Single token
const LoggerToken = createToken<LoggerInterface>('Logger')

// Multiple tokens from a shape
const Tokens = createTokens('app', {
	database: null as unknown as Database,
	server: null as unknown as Server,
})
// Tokens.database: Token<Database>
// Tokens.server: Token<Server>
```

### Interface Naming

All behavioral interfaces use the `*Interface` suffix:

| Interface | Purpose |
|-----------|---------|
| `LoggerInterface` | Structured logging |
| `DiagnosticInterface` | Error reporting, metrics, telemetry |
| `EmitterInterface` | Typed synchronous event emission |
| `EventBusInterface` | Async topic-based pub/sub |
| `QueueInterface` | Task queue with concurrency control |
| `LayerInterface` | Topological layer computation |
| `RegistryInterface` | Named singleton storage |

### Subscription Pattern

All `on*` methods return an `Unsubscribe` function for cleanup:

```typescript
// Subscribe to events
const unsubscribe = emitter.on('data', (value) => {
	console.log('Received:', value)
})

// Later: cleanup
unsubscribe()
```

---

## Adapter Lifecycle

The `Adapter` class is the foundation for lifecycle-managed singleton components.

### States

```
created → started → stopped → destroyed
                  ↘         ↗
                    started
```

| State | Description |
|-------|-------------|
| `created` | Initial state, instance exists |
| `started` | Component is running |
| `stopped` | Component is paused, can restart |
| `destroyed` | Component is cleaned up, instance cleared |

### Creating an Adapter

```typescript
import { Adapter } from '@orkestrel/core'

class HttpServer extends Adapter {
	#server: Server | null = null

	protected async onCreate() {
		// Called during Adapter.create()
		console.log('Creating server instance')
	}

	protected async onStart() {
		// Called during Adapter.start()
		this.#server = createServer()
		await this.#server.listen(3000)
		console.log('Server listening on port 3000')
	}

	protected async onStop() {
		// Called during Adapter.stop()
		await this.#server?.close()
		console.log('Server stopped')
	}

	protected async onDestroy() {
		// Called during Adapter.destroy()
		this.#server = null
		console.log('Server destroyed')
	}

	protected async onTransition(from: LifecycleState, to: LifecycleState, hook: LifecycleHook) {
		// Called after each transition
		console.log(`Transitioned from ${from} to ${to} via ${hook}`)
	}
}
```

### Static Methods (Singleton Pattern)

```typescript
// Create singleton instance
await HttpServer.create()
console.log(HttpServer.getState()) // 'created'

// Start the singleton
await HttpServer.start()
console.log(HttpServer.getState()) // 'started'

// Get the singleton instance
const server = HttpServer.getInstance()

// Stop the singleton
await HttpServer.stop()
console.log(HttpServer.getState()) // 'stopped'

// Restart from stopped state
await HttpServer.start()
console.log(HttpServer.getState()) // 'started'

// Destroy and clear singleton
await HttpServer.destroy()
console.log(HttpServer.getState()) // 'created' (no instance)
```

### Lifecycle Events

```typescript
// Subscribe to state transitions
const unsubscribe = HttpServer.on('transition', (state) => {
	console.log('New state:', state)
})

// Subscribe to specific hooks
HttpServer.on('start', () => console.log('Started!'))
HttpServer.on('stop', () => console.log('Stopped!'))
HttpServer.on('destroy', () => console.log('Destroyed!'))
HttpServer.on('error', (error) => console.error('Error:', error))

// Cleanup
unsubscribe()
```

### Adapter Options

```typescript
const options: AdapterOptions = {
	timeouts: 5000,           // Timeout for lifecycle hooks (ms)
	emitInitial: true,        // Emit initial state on first subscription
	emitter: customEmitter,   // Custom emitter instance
	queue: customQueue,       // Custom queue instance
	logger: customLogger,     // Custom logger instance
	diagnostic: customDiag,   // Custom diagnostic instance
}

await HttpServer.start(options)
```

---

## Container (Dependency Injection)

The `ContainerAdapter` provides minimal dependency injection for Adapter classes.

### Basic Usage

```typescript
import { ContainerAdapter, createToken, Adapter } from '@orkestrel/core'

class Database extends Adapter {}
class Cache extends Adapter {}

const DbToken = createToken<Database>('Database')
const CacheToken = createToken<Cache>('Cache')

const container = new ContainerAdapter()

// Register adapters
container.register(DbToken, { adapter: Database })
container.register(CacheToken, { adapter: Cache })

// Check existence
container.has(DbToken) // true

// Resolve (throws if not found)
const db = container.resolve(DbToken)

// Get (returns undefined if not found)
const cache = container.get(CacheToken)
```

### Child Containers

```typescript
// Create child that inherits from parent
const parent = new ContainerAdapter()
parent.register(DbToken, { adapter: Database })

const child = parent.createChild()
child.register(CacheToken, { adapter: Cache })

// Child can resolve from parent
child.resolve(DbToken) // Works - inherited from parent
child.resolve(CacheToken) // Works - registered in child

// Parent cannot resolve from child
parent.resolve(CacheToken) // Throws - not in parent
```

### Scoped Work

```typescript
// Run work in an auto-destroyed child scope
await container.using(async (scope) => {
	scope.register(TestToken, { adapter: TestAdapter })
	const test = scope.resolve(TestToken)
	// Use test...
}) // scope automatically destroyed here

// With setup function
await container.using(
	// Setup phase
	(scope) => {
		scope.register(MockToken, { adapter: MockAdapter })
	},
	// Work phase
	async (scope) => {
		const mock = scope.resolve(MockToken)
		return await runTests(mock)
	}
)
```

### Container Destruction

```typescript
// Destroy all owned adapters
await container.destroy()
// Calls stop() then destroy() on all registered adapters
```

### Global Container

```typescript
import { container } from '@orkestrel/core'

// Get default container
const c = container()

// Named containers
container.set('test', new ContainerAdapter())
const testContainer = container('test')

// Resolve from named container
const db = container.resolve(DbToken, 'test')

// List all container names
container.list() // ['test']

// Clear named container
container.clear('test')
```

---

## Orchestrator

The `OrchestratorAdapter` coordinates lifecycle phases in dependency order.

### Basic Usage

```typescript
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Database extends Adapter {
	protected async onStart() { console.log('DB started') }
	protected async onStop() { console.log('DB stopped') }
}

class Server extends Adapter {
	protected async onStart() { console.log('Server started') }
	protected async onStop() { console.log('Server stopped') }
}

const DbToken = createToken<Database>('Database')
const ServerToken = createToken<Server>('Server')

const container = new ContainerAdapter()
const app = new OrchestratorAdapter(container)

// Start with dependency graph
await app.start({
	[DbToken]: { adapter: Database },
	[ServerToken]: { adapter: Server, dependencies: [DbToken] },
})

// Output order:
// DB started
// Server started

// Stop in reverse order
await app.stop()

// Output order:
// Server stopped
// DB stopped

// Destroy all
await app.destroy()
```

### Registration Options

```typescript
await app.start({
	[DbToken]: {
		adapter: Database,
		dependencies: [ConfigToken],  // Start after ConfigToken
		timeouts: 10000,              // 10s timeout for this component
	},
	[ServerToken]: {
		adapter: Server,
		dependencies: [DbToken, CacheToken],
		timeouts: {
			onStart: 5000,   // 5s for start
			onStop: 2000,    // 2s for stop
			onDestroy: 1000, // 1s for destroy
		},
	},
})
```

### Orchestrator Options

```typescript
const app = new OrchestratorAdapter(container, {
	// Default timeouts for all components
	timeouts: 5000,

	// Event callbacks
	events: {
		onComponentStart: ({ token, durationMs }) => {
			console.log(`${String(token)} started in ${durationMs}ms`)
		},
		onComponentStop: ({ token, durationMs }) => {
			console.log(`${String(token)} stopped in ${durationMs}ms`)
		},
		onComponentDestroy: ({ token, durationMs }) => {
			console.log(`${String(token)} destroyed in ${durationMs}ms`)
		},
		onComponentError: (detail) => {
			console.error(`Error in ${detail.tokenDescription}:`, detail.error)
		},
	},

	// Tracing callbacks
	tracer: {
		onLayers: ({ layers }) => {
			console.log('Dependency layers:', layers)
		},
		onPhase: ({ phase, layer, outcomes }) => {
			console.log(`Phase ${phase}, layer ${layer}:`, outcomes)
		},
	},

	// Custom adapters
	layer: customLayerAdapter,
	queue: customQueueAdapter,
	logger: customLogger,
	diagnostic: customDiagnostic,
})
```

### Global Orchestrator

```typescript
import { orchestrator } from '@orkestrel/core'

// Get default orchestrator
const app = orchestrator()

// Named orchestrators
orchestrator.set('test', new OrchestratorAdapter())
const testApp = orchestrator('test')

// Scoped work
await orchestrator.using(async (app) => {
	await app.start(graph)
	// Work...
}) // Auto-destroy on exit
```

---

## Emitter (Typed Events)

The `EmitterAdapter` provides synchronous typed event emission.

### Basic Usage

```typescript
import { EmitterAdapter } from '@orkestrel/core'

// Define event map
type MyEvents = {
	start: []                    // No args
	data: [string]               // One string arg
	progress: [number, number]   // Two number args
	error: [Error]               // Error arg
}

const emitter = new EmitterAdapter<MyEvents>()

// Subscribe
const unsubscribe = emitter.on('data', (value) => {
	console.log('Received:', value)
})

// Emit
emitter.emit('start')
emitter.emit('data', 'hello')
emitter.emit('progress', 50, 100)
emitter.emit('error', new Error('Something went wrong'))

// Unsubscribe
unsubscribe()

// Or clear all listeners
emitter.removeAllListeners()
```

### Event Isolation

Errors in listeners are isolated and don't prevent other listeners from running:

```typescript
emitter.on('data', () => {
	throw new Error('Listener 1 fails')
})

emitter.on('data', (value) => {
	console.log('Listener 2 still runs:', value)
})

emitter.emit('data', 'test')
// Listener 1 throws, but listener 2 still executes
```

---

## EventBus (Async Pub/Sub)

The `EventAdapter` provides async topic-based publish/subscribe.

### Basic Usage

```typescript
import { EventAdapter } from '@orkestrel/core'

// Define topic payload types
type Topics = {
	'user.created': { id: string; name: string }
	'user.deleted': { id: string }
	'order.placed': { orderId: string; total: number }
}

const bus = new EventAdapter<Topics>()

// Subscribe to a topic
const unsubscribe = await bus.subscribe('user.created', async (payload) => {
	console.log('User created:', payload.name)
	await sendWelcomeEmail(payload.id)
})

// Publish to a topic
await bus.publish('user.created', { id: '123', name: 'Alice' })

// List all topics with subscribers
bus.topics() // ['user.created']

// Unsubscribe
unsubscribe()
```

### Options

```typescript
const bus = new EventAdapter<Topics>({
	// Handle errors from subscribers
	onError: (err, topic) => {
		console.error(`Error in ${topic} handler:`, err)
	},

	// Sequential execution (default: parallel)
	sequential: true,

	// Custom logger and diagnostic
	logger: customLogger,
	diagnostic: customDiagnostic,
})
```

---

## Queue (Task Execution)

The `QueueAdapter` provides task execution with concurrency control.

### Basic Queue Operations

```typescript
import { QueueAdapter } from '@orkestrel/core'

const queue = new QueueAdapter<string>({ capacity: 100 })

// Enqueue items
await queue.enqueue('task1')
await queue.enqueue('task2')
await queue.enqueue('task3')

// Check size
await queue.size() // 3

// Dequeue items (FIFO)
await queue.dequeue() // 'task1'
await queue.dequeue() // 'task2'
```

### Running Tasks

```typescript
const queue = new QueueAdapter()

// Run tasks with concurrency
const tasks = [
	() => fetchUser(1),
	() => fetchUser(2),
	() => fetchUser(3),
]

const results = await queue.run(tasks, {
	concurrency: 2,  // Max 2 concurrent tasks
	timeout: 5000,   // 5s timeout per task
})

console.log(results) // [user1, user2, user3]
```

### Queue Options

```typescript
const queue = new QueueAdapter({
	capacity: 1000,      // Max items in queue
	concurrency: 4,      // Default concurrency
	timeout: 10000,      // Default timeout per task (ms)
	deadline: 30000,     // Total deadline for all tasks (ms)
	signal: abortSignal, // AbortSignal for cancellation
	logger: customLogger,
	diagnostic: customDiagnostic,
})
```

---

## Registry (Named Singletons)

The `RegistryAdapter` provides named singleton storage with locking.

### Basic Usage

```typescript
import { RegistryAdapter } from '@orkestrel/core'

const registry = new RegistryAdapter<Database>({
	label: 'database',
	default: { value: new Database() }, // Optional default
})

// Set a named entry
registry.set('primary', primaryDb)
registry.set('replica', replicaDb, true) // Lock - cannot be overwritten

// Get (returns undefined if not found)
const db = registry.get('primary')

// Resolve (throws if not found)
const db2 = registry.resolve('replica')

// List all keys
registry.list() // ['primary', 'replica']

// Clear (returns true if cleared)
registry.clear('primary') // true
registry.clear('replica') // false - locked
registry.clear('replica', true) // true - force clear
```

---

## Layer (Topological Sort)

The `LayerAdapter` computes dependency layers using Kahn's algorithm.

### Computing Layers

```typescript
import { LayerAdapter, createToken } from '@orkestrel/core'

const A = createToken('A')
const B = createToken('B')
const C = createToken('C')
const D = createToken('D')

const layer = new LayerAdapter()

const nodes = [
	{ token: A, dependencies: [] },
	{ token: B, dependencies: [A] },
	{ token: C, dependencies: [A] },
	{ token: D, dependencies: [B, C] },
]

const layers = layer.compute(nodes)
// [[A], [B, C], [D]]
// Layer 0: A (no deps)
// Layer 1: B, C (depend on A)
// Layer 2: D (depends on B and C)
```

### Grouping Tokens

```typescript
// Group a subset of tokens by their layer order
const subset = [D, A, C]
const grouped = layer.group(subset, layers)
// [[A], [C], [D]]
```

---

## Logger

### LoggerAdapter (Console)

```typescript
import { LoggerAdapter } from '@orkestrel/core'

const logger = new LoggerAdapter()

logger.debug('Debug message', { extra: 'data' })
logger.info('Info message')
logger.warn('Warning message')
logger.error('Error message')

// Structured logging
logger.log('info', 'User logged in', { userId: '123', ip: '192.168.1.1' })
```

### NoopLogger (Silent)

```typescript
import { NoopLogger } from '@orkestrel/core'

const logger = new NoopLogger()
logger.info('This is silently ignored')
```

### FakeLogger (Testing)

```typescript
import { FakeLogger } from '@orkestrel/core'

const logger = new FakeLogger()

logger.info('Test message', { key: 'value' })
logger.error('Error occurred')

// Inspect logged entries
logger.entries // [{ level: 'info', message: 'Test message', args: [{ key: 'value' }] }, ...]

// Check for specific messages
logger.hasLevel('error') // true
logger.hasMessage('Test message') // true

// Clear entries
logger.clear()
```

---

## Diagnostic

The `DiagnosticAdapter` provides structured error handling, metrics, and telemetry.

### Error Handling

```typescript
import { DiagnosticAdapter } from '@orkestrel/core'

const diagnostic = new DiagnosticAdapter({
	logger: customLogger,
	messages: [
		{ key: 'ERR001', level: 'error', message: 'Something went wrong' },
		{ key: 'ERR002', level: 'warn', message: 'Deprecated feature used' },
	],
})

// Log an error with context
diagnostic.error(new Error('Connection failed'), {
	scope: 'lifecycle',
	code: 'ERR001',
	token: 'Database',
	phase: 'start',
})

// Throw a diagnostic error (never returns)
diagnostic.fail('ERR001', {
	message: 'Failed to connect',
	helpUrl: 'https://docs.example.com/errors/ERR001',
})

// Create an error without throwing
const error = diagnostic.help('ERR002', {
	message: 'This feature is deprecated',
})

// Aggregate multiple errors
diagnostic.aggregate('ERR001', errors, {
	message: 'Multiple failures occurred',
})
```

### Metrics and Telemetry

```typescript
// Record a metric
diagnostic.metric('http.requests', 1, { method: 'GET', path: '/api' })

// Record a trace
diagnostic.trace('database.query', { sql: 'SELECT * FROM users', durationMs: 15 })

// Record an event
diagnostic.event('user.login', { userId: '123' })
```

---

## Error Handling

### Error Classes

```typescript
import {
	OrkestrelError,
	NotFoundError,
	InvalidTransitionError,
	TimeoutError,
	AggregateLifecycleError,
	ContainerDestroyedError,
	CircularDependencyError,
	DuplicateRegistrationError,
} from '@orkestrel/core'

// Base error
throw new OrkestrelError('ORK001', 'Something went wrong', {
	helpUrl: 'https://docs.example.com/errors/ORK001',
	context: { scope: 'lifecycle' },
})

// Not found (resolve failures)
throw new NotFoundError('ORK1006', 'Provider not found', tokenSymbol, {
	helpUrl: 'https://docs.example.com/errors/ORK1006',
})

// Invalid state transition
throw new InvalidTransitionError('ORK1020', 'Invalid transition', 'created', 'stopped')

// Timeout
throw new TimeoutError('ORK1021', 'Hook timed out', 5000)

// Aggregate errors
throw new AggregateLifecycleError('ORK1013', 'Multiple failures', lifecycleDetails)
```

### Error Codes

| Code | Description |
|------|-------------|
| `ORK1005` | Container already destroyed |
| `ORK1006` | No provider for token |
| `ORK1007` | Invalid provider or duplicate registration |
| `ORK1013` | Errors during start phase |
| `ORK1014` | Errors during stop phase |
| `ORK1016` | Errors during container destroy |
| `ORK1017` | Errors during orchestrator destroy |
| `ORK1020` | Invalid lifecycle transition |
| `ORK1021` | Lifecycle hook timeout |
| `ORK1022` | Lifecycle hook error |
| `ORK1030` | Circular dependency detected |
| `ORK1099` | Internal invariant violation |

---

## Type Guards

### Native Type Guards

```typescript
import {
	isString,
	isNumber,
	isBoolean,
	isFunction,
	isRecord,
	isError,
	isArray,
	isLiteral,
	isArrayOf,
} from '@orkestrel/core'

isString('hello')      // true
isNumber(42)           // true
isNumber(NaN)          // false
isBoolean(true)        // true
isFunction(() => {})   // true
isRecord({ a: 1 })     // true
isRecord([1, 2])       // false
isError(new Error())   // true
isArray([1, 2, 3])     // true

// Literal guard
const isStatus = isLiteral('active', 'inactive', 'pending')
isStatus('active')     // true
isStatus('unknown')    // false

// Array element guard
const isStringArray = isArrayOf(isString)
isStringArray(['a', 'b']) // true
isStringArray(['a', 1])   // false
```

### Token Guards

```typescript
import {
	isToken,
	isTokenArray,
	isTokenRecord,
	isAdapterSubclass,
	isAdapterProvider,
} from '@orkestrel/core'

isToken(Symbol('x'))                    // true
isTokenArray([Symbol('a'), Symbol('b')]) // true
isTokenRecord({ a: Symbol('a') })        // true

isAdapterSubclass(MyAdapter)             // true (has static lifecycle methods)
isAdapterProvider({ adapter: MyAdapter }) // true
```

### Lifecycle Guards

```typescript
import {
	isLifecycleErrorDetail,
	isAggregateLifecycleError,
} from '@orkestrel/core'

const detail = {
	tokenDescription: 'Database',
	phase: 'start',
	context: 'normal',
	timedOut: false,
	durationMs: 150,
	error: new Error('Connection failed'),
}

isLifecycleErrorDetail(detail) // true

const aggregate = {
	details: [detail],
	errors: [detail.error],
}

isAggregateLifecycleError(aggregate) // true
```

---

## TypeScript Integration

### Strict Mode

The library is designed for TypeScript strict mode with `exactOptionalPropertyTypes`:

```json
{
	"compilerOptions": {
		"strict": true,
		"exactOptionalPropertyTypes": true,
		"noUncheckedIndexedAccess": true
	}
}
```

### Generic Constraints

```typescript
// Tokens are typed
const DbToken = createToken<Database>('Database')
const db: Database = container.resolve(DbToken) // Type-safe

// Event maps are typed
type Events = { data: [string] }
const emitter = new EmitterAdapter<Events>()
emitter.on('data', (value) => {
	// value is typed as string
})
```

### Readonly by Default

Return types use `readonly` for immutability:

```typescript
// Layers are readonly
const layers: readonly (readonly Token<unknown>[])[] = layer.compute(nodes)

// Registry list is readonly
const keys: readonly (string | symbol)[] = registry.list()
```

---

## API Reference

### Factory Functions

#### createToken\<T\>(description): Token\<T\>

Creates a unique typed token symbol.

```typescript
const UserToken = createToken<User>('User')
```

#### createTokens\<T\>(namespace, shape): TokensOf\<T\>

Creates multiple tokens from a shape object.

```typescript
const Tokens = createTokens('app', { db: null as unknown as Database })
// Tokens.db: Token<Database>
```

---

### Adapter

Abstract base class for lifecycle-managed singletons.

#### Static Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getInstance(opts?)` | `T` | Get or create singleton |
| `getState()` | `LifecycleState` | Current state |
| `create(opts?)` | `Promise<void>` | Transition to created |
| `start(opts?)` | `Promise<void>` | Transition to started |
| `stop()` | `Promise<void>` | Transition to stopped |
| `destroy()` | `Promise<void>` | Destroy and clear singleton |
| `on(event, fn)` | `Unsubscribe` | Subscribe to event |
| `off(event, fn)` | `void` | Unsubscribe from event |

#### Protected Hooks

| Hook | When Called |
|------|-------------|
| `onCreate()` | During `create()` |
| `onStart()` | During `start()` |
| `onStop()` | During `stop()` |
| `onDestroy()` | During `destroy()` |
| `onTransition(from, to, hook)` | After each transition |

---

### ContainerAdapter

Minimal DI container for Adapter classes.

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `register(token, provider, lock?)` | `this` | Register adapter |
| `has(token)` | `boolean` | Check if registered |
| `resolve(token)` | `T` | Get or throw |
| `get(token)` | `T \| undefined` | Get or undefined |
| `createChild()` | `ContainerAdapter` | Create child container |
| `using(fn)` | `Promise<T>` | Run in scoped child |
| `destroy()` | `Promise<void>` | Destroy all adapters |

---

### OrchestratorAdapter

Coordinates lifecycle phases in dependency order.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `container` | `ContainerAdapter` | Bound container |
| `layer` | `LayerInterface` | Layer adapter |
| `queue` | `QueueInterface` | Queue adapter |
| `logger` | `LoggerInterface` | Logger |
| `diagnostic` | `DiagnosticInterface` | Diagnostic |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `register(graph)` | `void` | Register components |
| `start(graph?)` | `Promise<void>` | Start in dependency order |
| `stop()` | `Promise<void>` | Stop in reverse order |
| `destroy()` | `Promise<void>` | Stop and destroy all |

---

### EmitterAdapter\<EMap\>

Typed synchronous event emitter.

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `on(event, fn)` | `Unsubscribe` | Subscribe to event |
| `emit(event, ...args)` | `void` | Emit event |
| `removeAllListeners()` | `void` | Clear all listeners |

---

### EventAdapter\<EMap\>

Async topic-based pub/sub.

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `subscribe(topic, handler)` | `Promise<Unsubscribe>` | Subscribe to topic |
| `publish(topic, payload)` | `Promise<void>` | Publish to topic |
| `topics()` | `readonly string[]` | List subscribed topics |

---

### QueueAdapter\<T\>

Task queue with concurrency control.

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `enqueue(item)` | `Promise<void>` | Add item to queue |
| `dequeue()` | `Promise<T \| undefined>` | Remove and return item |
| `size()` | `Promise<number>` | Current queue size |
| `run(tasks, opts?)` | `Promise<readonly R[]>` | Execute tasks |

---

### RegistryAdapter\<T\>

Named singleton storage with locking.

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `get(name?)` | `T \| undefined` | Get by name |
| `resolve(name?)` | `T` | Get or throw |
| `set(name, value, lock?)` | `void` | Set value |
| `clear(name?, force?)` | `boolean` | Clear entry |
| `list()` | `readonly (string \| symbol)[]` | List keys |

---

### LayerAdapter

Topological layer computation.

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `compute(nodes)` | `readonly (readonly Token[])[]` | Compute layers |
| `group(tokens, layers)` | `readonly (readonly Token[])[]` | Group by layer |

---

### Types

```typescript
// Core types
type Token<T> = symbol & { readonly __t?: T }
type Unsubscribe = () => void
type LifecycleState = 'created' | 'started' | 'stopped' | 'destroyed'
type LifecyclePhase = 'start' | 'stop' | 'destroy'
type LifecycleHook = 'create' | 'start' | 'stop' | 'destroy'
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Event types
type EventMap = Record<string, readonly unknown[]>
type EventListener<EMap, E> = (...args: EMap[E]) => unknown
type EventHandler<T> = (payload: T) => void | Promise<void>

// Provider types
type Provider<T> = T | ValueProvider<T> | FactoryProvider<T> | ClassProvider<T> | AdapterProvider<T>
```

---

## License

MIT © 2025 Orkestrel
