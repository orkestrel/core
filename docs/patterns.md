# Patterns

Opinionated ways to compose apps with Orkestrel.

## Preferred startup: start([...])
Source: [src/orchestrator.ts](../src/orchestrator.ts), [src/container.ts](../src/container.ts)
- At your app entry, declare all registrations in an array and call `orchestrator.start(regs)`.
- This both registers components and starts lifecycles in dependency order.

```ts
import { Orchestrator, Container, type OrchestratorRegistration } from '@orkestrel/core'

const c = new Container()
const app = new Orchestrator(c)

const regs: OrchestratorRegistration<unknown>[] = [
  { token: Ports.logger, provider: { useFactory: () => new Logger() } },
  { token: Ports.email, provider: { useFactory: c => new Email(c.get(Ports.logger)) }, deps: [Ports.logger] },
]
await app.start(regs)
```

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
- Use `deps` token edges to enforce deterministic ordering.
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
- Prefer `start([...])` for concise wiring, or call `register()` for fine-grained control.

## Error Handling
Source: [src/errors.ts](../src/errors.ts)
- `startAll`, `stopAll`, and `destroyAll` aggregate lifecycle errors and throw at the end (except `startAll` stops on the first failure).
- Inspect `AggregateLifecycleError.errors` to see all underlying errors.

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
