# Providers, lifetimes, and the Manager pattern

This guide explains how @orkestrel/core handles registration providers, lifetimes, scoping, and how to approach many instances. It reflects our philosophy: keep the core simple and explicit; prefer composition over configuration; no hidden magic.

Applies to: @orkestrel/core v1.x (Container, Orchestrator, Lifecycle, Tokens)

Contents
- Tokens and typing
- Provider types and ownership
- Lifetimes: singletons by design
- Scoping with child containers and `using`
- Many instances (transients) via the Manager pattern
- Orchestrator integration
- Async provider guard
- Edge cases and best practices

Tokens and typing
- A Token<T> is a typed handle used to register and retrieve values from the Container.
  
  Example:
  
  ```ts
  import { createToken } from '@orkestrel/core'
  
  export const Config = createToken<{ dbUrl: string }>('config')
  ```
- For grouped tokens, use createPortTokens to keep namespaced, explicit capabilities:
  
  ```ts
  import { createPortTokens } from '@orkestrel/core'
  
  export const Ports = createPortTokens({
    logger: {} as { info: (msg: string) => void },
    email: {} as { send: (to: string, subject: string, body: string) => Promise<void> },
  })
  ```

Provider types and ownership
- Register values using one of the following provider styles (all strictly synchronous):
  
  ```ts
  import { Container } from '@orkestrel/core'
  
  const c = new Container()
  
  // 1) Value forms — pre-built value or instance (container does not own disposal)
  c.register(Config, { useValue: { dbUrl: 'postgres://...' } })
  c.register(Config, { dbUrl: 'postgres://...' } as const) // bare value
  
  // 2) Factory forms — lazy singleton via function (container owns disposal of Lifecycle)
  // 2a) Tuple inject — best inference
  c.register(Ports.repo, {
    useFactory: (cfg: Cfg, log: Logger) => new Repo(cfg, log),
    inject: [Ports.config, Ports.logger],
  })
  
  // 2b) Object inject — named parameters in a single object
  c.register(Ports.svc, {
    useFactory: ({ repo, bus }: { repo: Repo, bus: Bus }) => new Service(repo, bus),
    inject: { repo: Ports.repo, bus: Ports.bus },
  })
  
  // 2c) No-deps — optional Container for manual resolution
  c.register(Ports.clock, { useFactory: () => new SystemClock() })
  c.register(Ports.email, { useFactory: (cc) => new Email(cc.resolve(Ports.logger)) })
  
  // 3) Class forms — lazy singleton via constructor
  // 3a) Tuple inject — positional dependencies
  c.register(Ports.bus, { useClass: EventBus, inject: [Ports.config, Ports.logger] })
  
  // 3b) No-deps — zero-arg or Container constructor
  c.register(Ports.zero, { useClass: ZeroArg })
  c.register(Ports.needs, { useClass: NeedsContainer }) // if constructor has arity 1, Container is passed
  ```

Inject typing helpers
- `InjectTuple<A>` and `InjectObject<O>` are exported types used internally to ensure your `inject` matches the parameter types of your factory or class constructor.
- You rarely need to reference them directly, but they are available in the public API for clarity and advanced typing.

Ownership semantics
- Container disposal:
  - Instances created by useFactory/useClass are considered container-created and will be destroyed by `container.destroy()` if they are Lifecycle instances.
  - Instances supplied via useValue (or bare value) are treated as externally owned; `container.destroy()` will not destroy them (even if they are Lifecycle instances).
- Orchestrator lifecycle management:
  - The Orchestrator starts/stops/destroys Lifecycle instances it manages (those registered with it) regardless of provider style.
  - If you registered a Lifecycle via useValue and did not orchestrate it, `container.destroy()` will not dispose it — orchestrate it or destroy it manually.

Lifetimes: singletons by design
- All providers are singletons per container. The first `get/resolve` materializes and caches.
- We intentionally avoid adding container-level "transient" or "scoped" lifetimes to keep the core simple and predictable.
- Instead, use composition:
  - Scoping: child containers and `using` (see below).
  - Transients: a Manager (a Lifecycle/Adapter) that owns many children and handles their lifecycle internally.

Scoping with child containers and `using`
- Child containers implement request/job/task scoping with singleton semantics within the scope:
  
  ```ts
  import { container } from '@orkestrel/core'
  
  const scope = container().createChild()
  try {
    // register scoped providers in `scope` if needed, then resolve and use
  } finally {
    await scope.destroy() // disposes container-owned lifecycles created in the scope
  }
  ```
- Convenience: run work in a child scope that’s automatically destroyed:
  
  ```ts
  import { container } from '@orkestrel/core'
  
  await container().using(async (scope) => {
    const { email } = scope.resolve({ email: Ports.email })
    await email.send('me@example.com', 'Hi', 'Welcome!')
  })
  ```

Many instances (transients) via the Manager pattern
- For lots of short‑lived instances, don’t register each instance in the container or the orchestrator.
- Instead, register a single Manager (a Lifecycle/Adapter) that owns and manages the children internally. The Manager exposes only aggregate lifecycle to the Orchestrator.
- Benefits: simplicity in the core, explicit ownership, domain-specific policies (creation, retries, batching) live where they belong.

Quick sketch
```ts
import { Adapter } from '@orkestrel/core'

class Worker extends Adapter { /* per-child lifecycle */ }

class WorkerManager extends Adapter {
  private workers = new Set<Worker>()
  protected async onStart() {
    // create N workers and start them; on failure, stop started ones and rethrow
  }
  protected async onStop() { /* stop all */ }
  protected async onDestroy() { /* destroy all */ }
  // expose only what the app needs (e.g., dispatch)
}
```

Orchestrator integration
- Register components and dependencies using the Orchestrator, then start/stop/destroy.
- Only the Manager is registered with the Orchestrator; it starts/stops/destroys its children internally.
- Timeouts can be configured per registration; defaults can be set on the Orchestrator.

Async provider guard
- Providers must be synchronous.
  - `useValue` must not be a Promise.
  - `useFactory` must be synchronous and must not return a Promise.
- Move async work to Lifecycle hooks (`onStart/onStop/onDestroy`) or pre-resolve values before registration.

Edge cases and best practices
- Value providers with Lifecycle:
  - The container won’t destroy value-provided lifecycles on `container.destroy()`. If you orchestrate them, `destroyAll` will handle it; otherwise, manage disposal yourself or switch to factory/class providers to transfer ownership to the container.
- Scopes:
  - Use child containers to implement request/job-level scoping. Register scoped singletons in the child; destroy the child to clean up.
- Many instances:
  - Prefer a Manager for many children. Avoid multi-binding and container-level transients to keep the system explicit and debuggable.
- Resolving many tokens across files:
  - Prefer map resolution: `container().resolve({ a: TokA, b: TokB })`.