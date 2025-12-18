# Ecosystem

<!-- Template: Integration and interoperability -->

How @orkestrel/core fits into your stack.

## Design philosophy

Orkestrel Core provides small, composable primitives — not a monolithic framework. It slots into existing stacks with minimal friction.

## Use cases

| Scenario                  | How it helps                                         |
|---------------------------|------------------------------------------------------|
| **Service orchestration** | Explicit startup/shutdown with timeouts and rollback |
| **Type-safe contracts**   | Compile-time safety with tokens and ports            |
| **Multi-tenant apps**     | Scoped containers for isolated contexts              |
| **Plugin systems**        | Dynamic registration and lifecycle management        |

## Integrations

### Logging

Implement `LoggerPort` to bridge to your logger:

```ts
import { LoggerPort, ContainerAdapter } from '@orkestrel/core'

class PinoLogger implements LoggerPort {
  // Delegate to Pino
  debug(msg: string, ...args: unknown[]) { pino.debug(msg, ...args) }
  info(msg: string, ...args: unknown[]) { pino.info(msg, ...args) }
  warn(msg: string, ...args: unknown[]) { pino.warn(msg, ...args) }
  error(msg: string, ...args: unknown[]) { pino.error(msg, ...args) }
  log(level: LogLevel, msg: string, fields?: Record<string, unknown>) { ... }
}

const container = new ContainerAdapter({ logger: new PinoLogger() })
```

### Metrics and tracing

Use `DiagnosticPort` to forward telemetry:

```ts
import { DiagnosticAdapter } from '@orkestrel/core'

const diag = new DiagnosticAdapter({
  logger: myLogger,
  messages: ORCHESTRATOR_MESSAGES,
})

// Use tracer hooks for structured data
const app = new OrchestratorAdapter(container, {
  tracer: {
    onPhase: (phase) => metrics.record('orchestrator.phase', phase),
  },
})
```

### Task scheduling

Plug in a custom `QueuePort`:

```ts
import { QueuePort, OrchestratorAdapter } from '@orkestrel/core'

class BullQueueAdapter implements QueuePort<unknown> {
  // Delegate to Bull
}

const app = new OrchestratorAdapter(container, { queue: new BullQueueAdapter() })
```

## Typical patterns

### Web servers

Model servers as Adapter subclasses:

```ts
class HttpServer extends Adapter {
  #server?: Server

  protected async onStart() {
    this.#server = createServer(handler)
    await new Promise(resolve => this.#server!.listen(3000, resolve))
  }

  protected async onStop() {
    await new Promise(resolve => this.#server?.close(resolve))
  }
}
```

### Workers and daemons

Group workers into layers and control concurrency:

```ts
const queue = new QueueAdapter({ concurrency: 3 })
const app = new OrchestratorAdapter(container, { queue })

await app.start({
  [Worker1]: { adapter: WorkerAdapter },
  [Worker2]: { adapter: WorkerAdapter },
  [Worker3]: { adapter: WorkerAdapter },
})
```

### Modular apps

Publish shared contracts as port tokens:

```ts
// shared-contracts package
export const ports = createPortTokens({
  logger: undefined as LoggerPort,
  config: undefined as ConfigPort,
})

// implementation package
container.register(ports.logger, { adapter: ConsoleLogger })
container.register(ports.config, { adapter: EnvConfig })
```

## Out of scope

Intentionally not included:

- HTTP routing
- Database clients
- ORM integrations
- Domain-specific features

These should be implemented as adapters you wire in.

## Stability

- Error codes are stable within major versions
- Core semantics follow SemVer
- See changelog for details

## Community

When publishing community adapters:

- Use token-friendly shapes
- Document dependencies
- Follow the Adapter pattern
- Include lifecycle hooks

## Next steps

| Guide                         | Description          |
|-------------------------------|----------------------|
| [Core](./core.md)             | Built-in adapters    |
| [Examples](./examples.md)     | More patterns        |
| [Contribute](./contribute.md) | Development workflow |

