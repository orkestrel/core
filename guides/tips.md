# Tips

<!-- Template: Patterns, best practices, and troubleshooting -->

Practical advice for common patterns and troubleshooting.

## Adapter patterns

### Keep hooks lightweight

```ts
class Good extends Adapter {
  #data?: SomeData
  
  protected async onStart() {
    this.#data = await fetchData() // OK: async work in hook
  }
}
```

### Override only what you need

```ts
class Minimal extends Adapter {
  // Only override hooks you actually need
  protected async onStart() { /* startup logic */ }
  // No need to override onStop/onDestroy if empty
}
```

### Use private fields

```ts
class Secure extends Adapter {
  #secret = 'hidden'  // Runtime-enforced privacy
  
  getSecret() { return this.#secret }
}
```

## Container patterns

### Lock critical providers

```ts
const container = new ContainerAdapter()

// Prevent accidental overrides
container.register(CriticalToken, { adapter: CriticalService }, true) // locked

// This will throw
container.register(CriticalToken, { adapter: Other }) // Error!
```

### Scoped testing

```ts
const root = new ContainerAdapter()
root.register(Token, { adapter: Production })

// Test with mock
await root.using(
  (scope) => scope.register(Token, { adapter: Mock }),
  async (scope) => {
    const mock = scope.resolve(Token)
    // test assertions
  }
)
// Scope destroyed, root unchanged
```

## Orchestrator patterns

### Default vs per-component timeouts

```ts
// Default for all components
const app = new OrchestratorAdapter(container, { 
  timeouts: 5000 
})

// Override for slow components
await app.start({
  [FastToken]: { adapter: Fast },
  [SlowToken]: { adapter: Slow, timeouts: { onStart: 30000 } },
})
```

### Events for logging

```ts
const app = new OrchestratorAdapter(container, {
  events: {
    onComponentStart: ({ token, durationMs }) => {
      console.log(`Started ${String(token)} in ${durationMs}ms`)
    },
    onComponentError: (detail) => {
      console.error(`Failed: ${detail.tokenDescription}`)
    },
  },
})
```

## Troubleshooting

### ORK1006: Missing provider

**Symptom**: `No provider for <token>`

**Fix**: Register before resolving, or use `get()` for optional dependencies.

```ts
container.register(Token, { adapter: Service }) // Register first
const svc = container.resolve(Token)            // Then resolve

// Or for optional
const maybe = container.get(OptionalToken)      // Returns undefined
```

### ORK1007: Duplicate registration

**Symptom**: `Duplicate registration`

**Fix**: Register each token only once per orchestrator start.

```ts
// Bad: same token twice
await app.start({
  [Token]: { adapter: A },
  [Token]: { adapter: B }, // Error!
})

// Good: one registration per token
await app.start({
  [TokenA]: { adapter: A },
  [TokenB]: { adapter: B },
})
```

### ORK1008: Unknown dependency

**Symptom**: `Unknown dependency X required by Y`

**Fix**: Register all dependencies.

```ts
// Bad: missing DbToken registration
await app.start({
  [ServerToken]: { adapter: Server, dependencies: [DbToken] },
})

// Good: register dependency first
await app.start({
  [DbToken]: { adapter: Database },
  [ServerToken]: { adapter: Server, dependencies: [DbToken] },
})
```

### ORK1009: Cycle detected

**Symptom**: `Cycle detected in dependency graph`

**Fix**: Break circular dependencies by restructuring or using events.

```ts
// Bad: A depends on B, B depends on A
{
  [A]: { adapter: ServiceA, dependencies: [B] },
  [B]: { adapter: ServiceB, dependencies: [A] },
}

// Good: use event bus for loose coupling
class ServiceA extends Adapter {
  protected async onStart() {
    bus.subscribe('b:ready', this.handleBReady)
  }
}
```

### ORK1021: Hook timed out

**Symptom**: `Hook 'onStart' timed out`

**Fix**: Reduce hook work or increase timeout.

```ts
// Increase timeout for slow operations
{
  [SlowToken]: { 
    adapter: SlowService, 
    timeouts: { onStart: 60000 } 
  }
}
```

### ORK1022: Hook failed

**Symptom**: `Hook 'onStart' failed`

**Fix**: Handle errors in hooks or fix the underlying issue.

```ts
class Robust extends Adapter {
  protected async onStart() {
    try {
      await riskyOperation()
    } catch (err) {
      // Handle or rethrow
      console.error('Failed to start:', err)
      throw err // Let orchestrator handle rollback
    }
  }
}
```

## Testing tips

- **Small timeouts**: Use 10-50ms in tests for fast feedback
- **NoopLogger**: Suppress output in tests
- **FakeLogger**: Assert on log entries
- **Scoped containers**: Isolate tests with `using()`

```ts
import { NoopLogger, FakeLogger, ContainerAdapter } from '@orkestrel/core'

const logger = new NoopLogger()
const container = new ContainerAdapter({ logger })

// Or capture logs
const fake = new FakeLogger()
const debug = new ContainerAdapter({ logger: fake })
// ... run tests
expect(fake.entries).toContain(...)
```

## Next steps

| Guide                         | Description          |
|-------------------------------|----------------------|
| [Tests](./tests.md)           | Testing guidance     |
| [FAQ](./faq.md)               | Common questions     |
| [Contribute](./contribute.md) | Development workflow |

