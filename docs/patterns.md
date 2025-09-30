# Patterns

Opinionated ways to compose apps with Orkestrel.

## Startup pattern: start([...])
Source: [src/orchestrator.ts](../src/orchestrator.ts), [src/container.ts](../src/container.ts)
- At your app entry, declare all registrations in an array and call `orchestrator.start(regs)`.
- This both registers components and starts lifecycles in dependency order.

```ts
import { Orchestrator, Container, type OrchestratorRegistration } from '@orkestrel/core'

const c = new Container()
const app = new Orchestrator(c)

const regs: OrchestratorRegistration<unknown>[] = [
  { token: Ports.logger, provider: { useFactory: () => new Logger() } },
  { token: Ports.email, provider: { useFactory: c => new Email(c.get(Ports.logger)) }, dependencies: [Ports.logger] },
]
await app.start(regs)
```

Shorthand helper
- Use `register(token, provider, ...deps)` to avoid writing `{ token, provider, dependencies }` repeatedly.

```ts
import { register } from '@orkestrel/core'

await app.start([
  register(Ports.logger, { useFactory: () => new Logger() }),
  register(Ports.email, { useFactory: c => new Email(c.get(Ports.logger)) }, Ports.logger),
])
```

Timeouts defaults
- Instead of specifying timeouts per registration, you can set defaults on the orchestrator:

```ts
const app = new Orchestrator(c, { defaultTimeouts: { onStart: 5000, onStop: 2000, onDestroy: 2000 } })
```

Events for telemetry
- Provide `events` callbacks on the orchestrator to centralize logging/metrics:

```ts
const app = new Orchestrator(c, {
  events: {
    onComponentStart: ({ token, durationMs }) => log('start', token.description, durationMs),
    onComponentError: (d) => log('error', d.tokenDescription, d.phase, d.timedOut),
  },
})
```

Timeouts per lifecycle phase
- You can specify optional timeouts per component when registering via `start([...])`.
- Example: `{ timeouts: { onStart: 5000, onStop: 2000, onDestroy: 2000 } }`.
- If a phase times out, it fails with telemetry noting `timedOut: true`.

Parallelization and rollback
- Start/stop/destroy are parallelized within each dependency layer.
- If any component in a layer fails to start, the orchestrator stops all previously started components (including successful ones in the same layer) in reverse order before throwing.
- Failures are aggregated and exposed via `AggregateLifecycleError.details` with token, phase, duration, and timeout flag.

## Single Orchestrator (App-level)
Source: [src/orchestrator.ts](../src/orchestrator.ts), [src/container.ts](../src/container.ts), [src/registry.ts](../src/registry.ts)
- Create one `Container` and one `Orchestrator` for your app.
- Compose modules by concatenating their registration arrays.

```ts
const infra: OrchestratorRegistration<unknown>[] = [/* infra regs */]
const regs = [...infra, ...userRegistrations()]
await orchestrator().start(regs)
```

## Explicit Dependencies
Source: [src/orchestrator.ts](../src/orchestrator.ts)
- Use `dependencies` token edges to enforce deterministic ordering.
- Inside factories, use the container to resolve dependent tokens when needed.

## Request/Job Scopes
Source: [src/container.ts](../src/container.ts)
- Use `container.createChild()` to build a per-request scope.
- When done, `await scope.destroy()` to tear down lifecycles and free resources.

```ts
const scope = container().createChild()
try {
  // resolve request-bound services from `scope`
} finally {
  await scope.destroy()
}
```

## Testing
Source: [src/orchestrator.ts](../src/orchestrator.ts), [src/container.ts](../src/container.ts), [src/ports.ts](../src/ports.ts)
- Use `start([...])` for concise wiring, or call `register()` for fine-grained control.

## Error Handling
Source: [src/errors.ts](../src/errors.ts)
- `startAll` stops on the first failing dependency layer and performs a rollback of already-started components.
- `stopAll` and `destroyAll` aggregate lifecycle errors across layers and throw once.
- Inspect `AggregateLifecycleError.details` for per-component telemetry (token, phase, durationMs, timedOut, context).

## Fine-grained control (register + startAll)
Source: [src/orchestrator.ts](../src/orchestrator.ts)
- Use when you need incremental wiring or custom ordering for tests.

```ts
app.register(Ports.logger, { useFactory: () => new Logger() })
app.register(Ports.email, { useFactory: c => new Email(c.get(Ports.logger)) }, [Ports.logger])
await app.startAll()
```

## Helpers vs Explicit DI
Source: [src/container.ts](../src/container.ts), [src/orchestrator.ts](../src/orchestrator.ts), [src/registry.ts](../src/registry.ts)
- Helpers (`container()`, `orchestrator()`) are optional and handy for app glue.
- Libraries should prefer receiving `Container`/`Orchestrator` instances explicitly for stricter DI.
