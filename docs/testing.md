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
