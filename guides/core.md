# Core

<!-- Template: Built-in adapters and runtime components -->

This guide covers the built-in adapters that ship with @orkestrel/core.

## Overview

| Adapter             | Purpose                              |
|---------------------|--------------------------------------|
| `LoggerAdapter`     | Console-like logging                 |
| `NoopLogger`        | Silent logger for tests              |
| `FakeLogger`        | In-memory logger for test assertions |
| `DiagnosticAdapter` | Error reporting and telemetry        |
| `EmitterAdapter`    | Typed event emitter                  |
| `EventAdapter`      | Async pub/sub event bus              |
| `QueueAdapter`      | Task queue with concurrency control  |
| `LayerAdapter`      | Topological layering                 |
| `RegistryAdapter`   | Named instance registry              |

## Logger

The `LoggerPort` interface provides level-based logging:

```ts
import { LoggerAdapter, NoopLogger } from '@orkestrel/core'

const logger = new LoggerAdapter()
logger.info('Application started', { version: '1.0.0' })
logger.error('Something failed', { code: 500 })

// For tests, use NoopLogger to suppress output
const silent = new NoopLogger()
```

### FakeLogger for testing

```ts
import { FakeLogger } from '@orkestrel/core'

const fake = new FakeLogger()
fake.info('test message', { key: 'value' })

// Assert on captured entries
console.log(fake.entries[0])
// { level: 'info', message: 'test message', fields: { key: 'value' } }
```

## Diagnostics

The `DiagnosticAdapter` provides structured error reporting:

```ts
import { DiagnosticAdapter, ORCHESTRATOR_MESSAGES } from '@orkestrel/core'

const diag = new DiagnosticAdapter({ messages: ORCHESTRATOR_MESSAGES })

// Log with level
diag.log('info', 'orchestrator.phase', { phase: 'start' })

// Report an error
diag.error(new Error('failed'), { scope: 'orchestrator' })

// Throw with a code
diag.fail('ORK1006', { message: 'No provider' })

// Create error without throwing
const err = diag.help('ORK1021', { message: 'Hook timed out' })
```

## Emitter

Type-safe synchronous event emitter:

```ts
import { EmitterAdapter } from '@orkestrel/core'

type Events = {
  start: []
  data: [string]
  error: [Error]
}

const emitter = new EmitterAdapter<Events>()

emitter.on('data', (value) => console.log('Received:', value))
emitter.emit('data', 'hello')
emitter.off('data', handler)
emitter.removeAllListeners()
```

## Event bus

Async pub/sub with sequential or parallel delivery:

```ts
import { EventAdapter } from '@orkestrel/core'

type Events = {
  'user:created': { id: string; name: string }
  'user:deleted': { id: string }
}

const bus = new EventAdapter<Events>({ sequential: true })

const unsubscribe = await bus.subscribe('user:created', async (payload) => {
  console.log('User created:', payload.name)
})

await bus.publish('user:created', { id: 'u1', name: 'Alice' })
await unsubscribe()
```

## Queue

Task queue with concurrency, timeouts, and deadlines:

```ts
import { QueueAdapter } from '@orkestrel/core'

const queue = new QueueAdapter({ concurrency: 2, timeout: 1000 })

const results = await queue.run([
  async () => { await delay(100); return 1 },
  async () => { await delay(50); return 2 },
  async () => { await delay(200); return 3 },
])
// Results in input order: [1, 2, 3]
```

### Options

| Option        | Description                        |
|---------------|------------------------------------|
| `concurrency` | Max parallel tasks                 |
| `timeout`     | Per-task timeout (ms)              |
| `deadline`    | Shared deadline for all tasks (ms) |
| `signal`      | AbortSignal for cancellation       |

## Layer

Compute dependency layers using Kahn's algorithm:

```ts
import { LayerAdapter, createToken } from '@orkestrel/core'

const A = createToken('A')
const B = createToken('B')
const C = createToken('C')

const layer = new LayerAdapter()
const layers = layer.compute([
  { token: A, dependencies: [] },
  { token: B, dependencies: [A] },
  { token: C, dependencies: [A, B] },
])
// [[A], [B], [C]]
```

## Registry

Named instance registry with locking:

```ts
import { RegistryAdapter } from '@orkestrel/core'

const registry = new RegistryAdapter<number>({
  label: 'config',
  default: { value: 42 }
})

registry.set('alt', 100, true) // locked
const value = registry.resolve()     // 42
const alt = registry.resolve('alt')  // 100
registry.clear('alt')                // false (locked)
registry.clear('alt', true)          // true (forced)
```

## Injecting ports

All adapters accept optional `logger` and `diagnostic` options:

```ts
import { ContainerAdapter, NoopLogger, DiagnosticAdapter } from '@orkestrel/core'

const logger = new NoopLogger()
const diagnostic = new DiagnosticAdapter({ logger })

const container = new ContainerAdapter({ logger, diagnostic })
```

## Next steps

| Guide                     | Description                  |
|---------------------------|------------------------------|
| [Examples](./examples.md) | Copy-pasteable patterns      |
| [Tips](./tips.md)         | Patterns and troubleshooting |
| [Tests](./tests.md)       | Testing guidance             |

