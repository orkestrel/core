# FAQ

<!-- Template: Common questions and answers -->

Answers from basic to advanced. For detailed API signatures, see the generated TypeDoc.

## Basics

### What is a token?

A token is a typed symbol used as a key for registration and resolution:

```ts
import { createToken, ContainerAdapter } from '@orkestrel/core'

const Token = createToken<number>('config:port')
const c = new ContainerAdapter()
c.set(Token, 8080)
console.log(c.resolve(Token)) // 8080
```

### What's an Adapter?

The base class for all components with lifecycle management:

```ts
import { Adapter } from '@orkestrel/core'

class MyService extends Adapter {
  protected async onStart() { /* startup logic */ }
  protected async onStop() { /* cleanup logic */ }
}
```

### How do I register and resolve?

```ts
import { ContainerAdapter, Adapter, createToken } from '@orkestrel/core'

class Service extends Adapter {}
const Token = createToken<Service>('Service')

const container = new ContainerAdapter()
container.register(Token, { adapter: Service })
const instance = container.resolve(Token)
```

### What if a token isn't registered?

- `resolve(token)` throws ORK1006
- `get(token)` returns `undefined`

```ts
const missing = container.get(UnknownToken) // undefined
container.resolve(UnknownToken) // throws ORK1006
```

## Intermediate

### How does scoping work?

Child containers inherit from parents and can override:

```ts
const root = new ContainerAdapter()
root.set(Token, 'parent')

const result = await root.using(async (scope) => {
  scope.set(Token, 'child')
  return scope.resolve(Token)
})
// result === 'child'
// root.resolve(Token) === 'parent'
```

### How are dependencies determined?

Explicitly via the `dependencies` option:

```ts
await app.start({
  [DbToken]: { adapter: Database },
  [ServerToken]: { adapter: Server, dependencies: [DbToken] },
})
```

### What happens if a component fails to start?

The orchestrator rolls back — already-started components are stopped in reverse order:

```ts
try {
  await app.start(registrations)
} catch (err) {
  // Started components have been stopped
  // err contains aggregated details
}
```

### How do timeouts work?

Each hook has a timeout (default 5000ms):

```ts
// Global default
const app = new OrchestratorAdapter(container, { timeouts: 5000 })

// Per-component
{
  [Token]: { adapter: Service, timeouts: { onStart: 10000 } }
}

// Per-adapter instance
await MyAdapter.start({ timeouts: 3000 })
```

## Advanced

### Multi-tenant / per-request?

Use scoped containers:

```ts
const root = new ContainerAdapter()

// Per-request
async function handleRequest(tenantId: string) {
  await root.using(async (scope) => {
    scope.set(TenantToken, tenantId)
    // Request handling with tenant context
  })
}
```

### Global helpers

Access default or named instances without threading:

```ts
import { container, orchestrator } from '@orkestrel/core'

// Default container
container().register(Token, { adapter: Service })

// Named container
container('tenant-1').set(ConfigToken, tenantConfig)

// Access
const svc = container.resolve(Token)
```

### Controlling concurrency

Inject a QueuePort to cap parallelism:

```ts
import { QueueAdapter, OrchestratorAdapter, ContainerAdapter } from '@orkestrel/core'

const queue = new QueueAdapter({ concurrency: 2 })
const app = new OrchestratorAdapter(new ContainerAdapter(), { queue })
```

### Observability

Use events for logging and tracer for structured data:

```ts
const app = new OrchestratorAdapter(container, {
  events: {
    onComponentStart: ({ token, durationMs }) => log('Started', token),
    onComponentError: (detail) => log('Failed', detail),
  },
  tracer: {
    onLayers: ({ layers }) => record('layers', layers),
    onPhase: (phase) => record('phase', phase),
  },
})
```

## Troubleshooting

### Missing provider

**Code**: ORK1006  
**Fix**: Register before resolving, or use `get()` for optional.

### Duplicate registration

**Code**: ORK1007  
**Fix**: Register each token once per start call.

### Unknown dependency

**Code**: ORK1008  
**Fix**: Register all dependencies.

### Cycle detected

**Code**: ORK1009  
**Fix**: Break cycles by restructuring or using events.

### Hook timed out

**Code**: ORK1021  
**Fix**: Reduce work or increase timeout.

### Hook failed

**Code**: ORK1022  
**Fix**: Handle errors in hooks.

## Quick reference

| Method                                | Description                         |
|---------------------------------------|-------------------------------------|
| `createToken<T>(desc)`                | Create typed token                  |
| `container.register(token, provider)` | Register adapter                    |
| `container.resolve(token)`            | Get instance (throws if missing)    |
| `container.get(token)`                | Get instance (undefined if missing) |
| `container.using(fn)`                 | Scoped work                         |
| `MyAdapter.start()`                   | Start singleton                     |
| `MyAdapter.stop()`                    | Stop singleton                      |
| `MyAdapter.destroy()`                 | Destroy singleton                   |
| `app.start(graph)`                    | Start in dependency order           |
| `app.stop()`                          | Stop in reverse order               |
| `app.destroy()`                       | Stop and destroy all                |

## Next steps

| Guide                         | Description          |
|-------------------------------|----------------------|
| [Contribute](./contribute.md) | Development workflow |
| [Examples](./examples.md)     | More patterns        |

