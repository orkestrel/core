# Testing

Guidelines to keep tests fast, deterministic, and representative of real-world usage without adding heavy tooling.

## Principles
- Prefer tiny, isolated scenarios that map directly to source behaviors.
- Avoid mocks/fakes/spies in this core repo. Use real components and built-ins only. Consumers can use fakes/spies when testing their apps.
- Keep timeouts small to make tests snappy and still representative. Favor deterministic assertions.

## Patterns

### Scoping with Container.using
Run code within a child scope and ensure cleanup after execution.
```ts
import { Container } from '@orkestrel/core'

const root = new Container()
const result = await root.using(async (scope) => {
  // register overrides in the scoped container if needed
  // use scope.resolve(...) inside the scope
  return 42
})
// scope is destroyed here
```

Apply overrides via an `apply` callback before running work:
```ts
import { Container, createToken } from '@orkestrel/core'

const T = createToken<string>('test:val')
const root = new Container()
const out = await root.using(
  (scope) => {
    scope.register(T, { useValue: 'scoped' })
  },
  async (scope) => {
    return scope.resolve(T)
  },
)
// out === 'scoped'; scope was destroyed after the function
```

### Lifecycle expectations
Assert transitions and errors using real Lifecycle-derived classes.
```ts
import { Lifecycle } from '@orkestrel/core'
import { strict as assert } from 'node:assert'

class Svc extends Lifecycle {
  protected async onStart() { /* lightweight */ }
  protected async onStop() { /* lightweight */ }
}

const s = new Svc({ timeouts: 50 })
await s.start()
assert.equal(s.state, 'started')
await s.stop()
assert.equal(s.state, 'stopped')
```

### Orchestrator flows
Use the Orchestrator to exercise start/stop/destroy ordering with small graphs.
```ts
import { Orchestrator, Container, register, createToken, Lifecycle } from '@orkestrel/core'

interface Port { n(): number }
const T = createToken<Port>('test:port')

class Impl extends Lifecycle implements Port {
  n() { return 1 }
}

const app = new Orchestrator(new Container())
app.register(T, { useFactory: () => new Impl() })
await app.start()
await app.stop()
await app.destroy()
```

## Deterministic timeouts
- Keep hook and orchestrator timeouts low (e.g., 10–50ms) in tests.
- Avoid external timer-mocking libraries; structure code to be deterministic with short timers.

## Aggregated errors
Catch `AggregateLifecycleError` when testing error paths and inspect `details` for per-component context.
```ts
import { AggregateLifecycleError } from '@orkestrel/core'

try {
  await app.stop()
} catch (e) {
  if (e instanceof AggregateLifecycleError) {
    // assert on e.details (phase, tokenDescription, timedOut, durationMs, error.message)
  } else {
    throw e
  }
}
```

## Policy for the core repo
- No mocks, fakes, or spies in tests here; use only built-ins and actual code paths.
- Keep tests short and focused. Add happy-path + 1–2 edge cases for public behavior.
- Aim for fast runs (seconds, not minutes) with `tsx --test` and `tsc --noEmit`.
