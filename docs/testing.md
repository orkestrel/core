# Testing Recipes

This guide shows how to test code that uses `@orkestrel/core`.

Note: The library is environment-agnostic. The examples below use Node’s built-in `node:test` runner, but you can adapt them to Vitest/Jest easily.

## Unit testing with node:test

```ts
// example.spec.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Container, Orchestrator, Adapter, createToken } from '@orkestrel/core'

class Service extends Adapter { protected async onStart() {} protected async onStop() {} }
const Svc = createToken<Service>('Svc')

test('service starts and stops', async () => {
  const c = new Container()
  const app = new Orchestrator(c)
  app.register(Svc, { useFactory: () => new Service() })
  await app.startAll()
  assert.ok(c.resolve(Svc) instanceof Service)
  await app.stopAll()
  await app.destroyAll()
})
```

You can also use the `register(...)` helper to build arrays for `start([...])`:

```ts
import { register } from '@orkestrel/core'

await app.start([
    register(Svc, { useFactory: () => new Service() })
])
```

## Aggregated error assertions

When batch operations fail, the orchestrator throws `AggregateLifecycleError` with details.

```ts
import type { AggregateLifecycleError } from '@orkestrel/core'

try {
  await app.stopAll()
} catch (e) {
  const agg = e as AggregateLifecycleError
  // details contain per-component telemetry
  console.log(agg.details.map(d => [d.tokenDescription, d.phase, d.timedOut]))
}
```

## Using default timeouts

```ts
const app = new Orchestrator(new Container(), { defaultTimeouts: { onStart: 2000, onStop: 2000 } })
```

## Test isolation tips
- Prefer creating a fresh `Container`/`Orchestrator` per test to avoid cross-test state.
- If using the global helpers (`container()`, `orchestrator()`), make sure to clear them in `afterEach`.
- Keep adapters side-effect free on import; do work inside lifecycle hooks.

## Fakes, mocks, and spies for external systems (for consumers)
Use doubles only at boundaries with external dependencies (HTTP, DB, third‑party APIs). Keep core business logic and lifecycle tests close to real behavior.

Patterns
- Fake service (recommended): implement the port with an in‑memory class.
- Spy (lightweight): wrap a method to capture calls while delegating to a real implementation.
- Mock/stub (limited): return canned results when the external system is impractical to run in tests.

Example: fake external email port
```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Container, createPortTokens } from '@orkestrel/core'

interface Email { send(to: string, subject: string, body: string): Promise<void> }
const Ports = createPortTokens({ email: {} as Email })

class FakeEmail implements Email {
  sent: Array<{ to: string; subject: string; body: string }> = []
  async send(to: string, subject: string, body: string) { this.sent.push({ to, subject, body }) }
}

test('sends a welcome email', async () => {
  const c = new Container()
  // override via useValue for this test
  c.register(Ports.email, { useValue: new FakeEmail() })

  const email = c.resolve(Ports.email) as FakeEmail
  await email.send('me@example.com', 'Hi', 'Welcome!')
  assert.equal(email.sent.length, 1)
})
```

Example: simple spy around a logger
```ts
type Logger = { info: (msg: string) => void }
const Ports = createPortTokens({ logger: {} as Logger })

function withSpy<T extends object>(obj: T, onCall: (method: string, args: unknown[]) => void): T {
  return new Proxy(obj, { get(target, p, r) {
    const v = Reflect.get(target, p, r)
    if (typeof v !== 'function') return v
    return (...args: unknown[]) => { onCall(String(p), args); return (v as Function).apply(target, args) }
  } })
}
```

Tips
- Prefer behavior assertions (outputs, state changes) over call counts.
- Keep doubles small and local to the test; avoid global state.
- Replace only external boundaries; keep internal collaborators real.

Policy note
- The core repository’s own tests do not use fakes, mocks, or spies. They rely on real components and built‑in primitives to ensure real‑world signal. This section is for consumers testing integrations with external systems.
