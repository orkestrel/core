# Tests

<!-- Template: Testing guidance and patterns -->

Guidelines for fast, deterministic tests.

## Principles

- **Isolated scenarios**: Map directly to source behaviors
- **No mocks**: Use real components (mocks allowed in consumer apps)
- **Small timeouts**: Fast tests with short timers
- **Deterministic**: Avoid flaky timing dependencies

## Patterns

### Scoped testing

```ts
import { ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

const Token = createToken<Adapter>('test')
const root = new ContainerAdapter()

// Isolated test with cleanup
const result = await root.using(async (scope) => {
  class TestAdapter extends Adapter {}
  scope.register(Token, { adapter: TestAdapter })
  return scope.resolve(Token)
})
// Scope destroyed after test
```

### Override pattern

```ts
import { ContainerAdapter, createToken, Adapter } from '@orkestrel/core'

class Production extends Adapter {
  getValue() { return 'prod' }
}

class Mock extends Adapter {
  getValue() { return 'mock' }
}

const Token = createToken<Production>('Test')
const root = new ContainerAdapter()
root.register(Token, { adapter: Production })

// Test with override
const result = await root.using(
  (scope) => {
    scope.register(Token, { adapter: Mock })
  },
  (scope) => {
    return scope.resolve(Token).getValue()
  }
)
// result === 'mock'
// root still has Production
```

### Lifecycle assertions

```ts
import { Adapter, NoopLogger } from '@orkestrel/core'
import { strict as assert } from 'node:assert'

class TestService extends Adapter {
  started = false
  protected async onStart() { this.started = true }
  protected async onStop() { this.started = false }
}

// Test lifecycle
await TestService.start({ timeouts: 50, logger: new NoopLogger() })
assert.equal(TestService.getState(), 'started')
assert.equal(TestService.getInstance().started, true)

await TestService.stop()
assert.equal(TestService.getState(), 'stopped')

await TestService.destroy()
```

### Orchestrator testing

```ts
import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken, NoopLogger } from '@orkestrel/core'
import { strict as assert } from 'node:assert'

class ServiceA extends Adapter {}
class ServiceB extends Adapter {}

const TokenA = createToken<ServiceA>('A')
const TokenB = createToken<ServiceB>('B')

const logger = new NoopLogger()
const container = new ContainerAdapter({ logger })
const app = new OrchestratorAdapter(container, { logger, timeouts: 50 })

await app.start({
  [TokenA]: { adapter: ServiceA },
  [TokenB]: { adapter: ServiceB, dependencies: [TokenA] },
})

assert.equal(ServiceA.getState(), 'started')
assert.equal(ServiceB.getState(), 'started')

await app.destroy()
```

### Error testing

```ts
import { isAggregateLifecycleError } from '@orkestrel/core'
import { strict as assert } from 'node:assert'

try {
  await app.stop()
} catch (err) {
  if (isAggregateLifecycleError(err)) {
    for (const detail of err.details) {
      console.log(`${detail.tokenDescription} failed:`, detail.error.message)
    }
  } else {
    throw err
  }
}
```

## Timeout configuration

Keep timeouts small for fast tests:

```ts
// Adapter level
await MyAdapter.start({ timeouts: 50 })

// Orchestrator level
const app = new OrchestratorAdapter(container, { timeouts: 50 })

// Per-component
await app.start({
  [Token]: { adapter: Service, timeouts: 10 }
})
```

## Logger configuration

Suppress output in tests:

```ts
import { NoopLogger, ContainerAdapter, OrchestratorAdapter } from '@orkestrel/core'

const logger = new NoopLogger()
const container = new ContainerAdapter({ logger })
const app = new OrchestratorAdapter(container, { logger })
```

Or capture for assertions:

```ts
import { FakeLogger } from '@orkestrel/core'

const logger = new FakeLogger()
// ... run code
assert.equal(logger.entries[0].message, 'expected message')
```

## Test structure

```ts
import { describe, test, beforeEach, afterEach } from 'vitest'
import { NoopLogger, OrchestratorAdapter, ContainerAdapter } from '@orkestrel/core'

describe('MyService', () => {
  let logger: NoopLogger
  let container: ContainerAdapter
  let app: OrchestratorAdapter

  beforeEach(() => {
    logger = new NoopLogger()
    container = new ContainerAdapter({ logger })
    app = new OrchestratorAdapter(container, { logger, timeouts: 50 })
  })

  afterEach(async () => {
    await app.destroy().catch(() => {})
  })

  test('starts successfully', async () => {
    // test implementation
  })
})
```

## Guidelines for this repo

- No mocks, fakes, or spies — use real adapters
- Keep tests short and focused
- Cover happy path + key edge cases
- Fast runs (seconds, not minutes)

## Next steps

| Guide                         | Description          |
|-------------------------------|----------------------|
| [FAQ](./faq.md)               | Common questions     |
| [Contribute](./contribute.md) | Development workflow |

