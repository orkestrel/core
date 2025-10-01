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
  { token: Ports.email, provider: { useFactory: c => new Email(c.resolve(Ports.logger)) }, dependencies: [Ports.logger] },
]
await app.start(regs)
```

Helper: register
- Use `register(token, provider)`.
- Or `register(token, provider, { dependencies: [... or { alias: token }], timeouts: { onStart?, onStop?, onDestroy? } })`.
- Dependencies are de-duplicated and self-dependency is ignored.

```ts
import { register } from '@orkestrel/core'

await app.start([
  register(Ports.logger, { useFactory: () => new Logger() }),
  register(
    Ports.email,
    { useFactory: c => new Email(c.resolve(Ports.logger)) },
    { dependencies: { log: Ports.logger }, timeouts: { onStart: 5000 } }
  ),
])
```

Inline form (equivalent):
```ts
await app.start([
  { token: Ports.logger, provider: { useFactory: () => new Logger() } },
  { token: Ports.email, provider: { useFactory: c => new Email(c.resolve(Ports.logger)) }, dependencies: [Ports.logger], timeouts: { onStart: 5000 } },
])
```

## Timeouts defaults
- Instead of specifying timeouts per registration, you can set defaults on the orchestrator:

```ts
const app = new Orchestrator(c, { defaultTimeouts: { onStart: 5000, onStop: 2000, onDestroy: 2000 } })
```

## Events for telemetry
- Provide `events` callbacks on the orchestrator to centralize logging/metrics:

```ts
const app = new Orchestrator(c, {
  events: {
    onComponentStart: ({ token, durationMs }) => log('start', token.description, durationMs),
    onComponentError: (d) => log('error', d.tokenDescription, d.phase, d.timedOut),
  },
})
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

Or, use the convenience `using` helper to run work in a child scope that’s automatically destroyed:
```ts
await container().using(async (scope) => {
  const { svc } = scope.resolve({ svc: Ports.userService })
  await svc.createUser('x@example.com', 'X')
})
```

## Fine-grained control (register + startAll)
Source: [src/orchestrator.ts](../src/orchestrator.ts)
- Use when you need incremental wiring or custom ordering for tests.

```ts
app.register(Ports.logger, { useFactory: () => new Logger() })
app.register(Ports.email, { useFactory: c => new Email(c.resolve(Ports.logger)) }, [Ports.logger])
await app.startAll()
```

## Helpers vs Explicit DI
Source: [src/container.ts](../src/container.ts), [src/orchestrator.ts](../src/orchestrator.ts), [src/registry.ts](../src/registry.ts)
- Helpers (`container()`, `orchestrator()`) are optional and handy for app glue.
- Libraries should prefer receiving `Container`/`Orchestrator` instances explicitly for stricter DI.
