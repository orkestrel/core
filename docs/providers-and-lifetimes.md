# Providers, lifetimes, and many-instances patterns

This guide explains how orkestrel/core handles registration providers, lifetimes (singleton vs scoped vs transient), and patterns for managing many instances. It also clarifies type guidance and lifecycle ownership semantics.

Applies to: @orkestrel/core v1.x (Container, Orchestrator, Lifecycle, Tokens)

Contents
- Tokens and typing
- Provider types and ownership
- Singleton and scoping
- Transient pattern (factory tokens)
- Many-instances patterns
- Orchestrator integration
- Async work and timeouts
- Edge cases and best practices

Tokens and typing
- A Token<T> is a typed handle used to register and retrieve values from the Container.
  
  Example:
  
  ```ts
  import { createToken } from '@orkestrel/core'
  
  export const Config = createToken<{ dbUrl: string }>('config')
  ```
- For grouped tokens, use createTokens/ports helpers:
  
  ```ts
  import { createPortTokens } from '@orkestrel/core'
  
  export const Ports = createPortTokens({
    logger: {} as { info: (msg: string) => void },
    metrics: {} as { increment: (key: string) => void },
  })
  ```

Provider types and ownership
- You can register values using one of the following provider styles:
  
  ```ts
  import { Container } from '@orkestrel/core'
  
  const c = new Container()
  
  // 1) useValue — pre-built value or instance (container does not own disposal)
  c.register(Config, { useValue: { dbUrl: 'postgres://...' } })
  
  // 2) useFactory — lazy singleton via function (container owns disposal of Lifecycle)
  c.register(Ports.logger, { useFactory: () => createLogger() })
  
  // 3) useClass — lazy singleton via constructor(new (c: Container) => T)
  c.register(Ports.metrics, { useClass: MetricsAdapter })
  
  // 4) Bare value — equivalent to useValue but less explicit
  c.register(Config, { dbUrl: 'postgres://...' }) // typed as Provider<T> union
  ```

Ownership semantics
- Container disposal:
  - Instances created by useFactory/useClass are considered container-created and will be destroyed by container.destroy() if they are Lifecycle instances.
  - Instances supplied via useValue (or bare value) are treated as externally owned; container.destroy() will not destroy them (even if they are Lifecycle instances).
- Orchestrator lifecycle management:
  - The Orchestrator will start/stop/destroy Lifecycle instances it knows about regardless of provider style. This is usually how long-lived components are managed.

Do we need all three styles?
- Yes, each style communicates intent:
  - useValue: you already have a value/instance. Container won’t own its disposal. Great for constants or when a value is managed elsewhere.
  - useFactory: DI-friendly way to assemble instances from other tokens without coupling classes to the Container.
  - useClass: convenience for container-aware classes (e.g., Adapters that intentionally accept Container in their constructor). Prefer useFactory for classes that should stay container-agnostic.

Singleton and scoping
- All providers are lazy singletons per container instance. The first get() materializes and caches.
- Container hierarchy:
  
  ```ts
  const root = new Container()
  const child = root.createChild()
  
  // Register in root => shared singleton visible to child
  root.register(Config, { useValue: { dbUrl: '...' } })
  child.get(Config) === root.get(Config) // true
  
  // Register in child => overrides just for child scope
  child.register(Ports.logger, { useFactory: () => createLogger('scope') })
  ```
- Scoped singletons: create a child container per request/job/task, register scoped providers there, and destroy the child to clean up.

Transient pattern (factory tokens)
- The container always caches providers (i.e., not transient by default). For truly transient instances, inject a factory function as the token’s type.
  
  ```ts
  // Define a factory token that returns a new instance each time you call it.
  import { createToken } from '@orkestrel/core'
  
  type Handler = { handle: (payload: unknown) => Promise<void> }
  export const HandlerFactory = createToken<() => Handler>('handlerFactory')
  
  const c = new Container()
  c.register(HandlerFactory, { useFactory: () => () => createHandler() })
  
  // elsewhere
  const makeHandler = c.get(HandlerFactory)
  const h1 = makeHandler()
  const h2 = makeHandler() // distinct instance
  ```
- If transient instances have lifecycles, place them under a manager component (see next section) to ensure they are started/stopped/destroyed appropriately.

Many-instances patterns
- Composite/Manager pattern (recommended for orchestrated lifecycles):
  - Register one manager Lifecycle that discovers/creates child instances and owns their start/stop/destroy.
  - The Orchestrator manages only the manager; the manager manages its children.
  
  ```ts
  import { Adapter } from '@orkestrel/core'
  
  class WorkerManager extends Adapter {
    private workers: Set<Adapter> = new Set()
    
    protected async onStart() {
      // create N workers and start them
      for (let i = 0; i < 4; i++) {
        const w = new Worker()
        await w.start()
        this.workers.add(w)
      }
    }
    
    protected async onStop() {
      for (const w of this.workers) await w.stop()
    }
    
    protected async onDestroy() {
      for (const w of this.workers) await w.destroy()
      this.workers.clear()
    }
  }
  ```
- Multiple tokens (explicit instances): register multiple distinct tokens when each instance must be independently referenced or ordered by the Orchestrator.
- Factory token for collections: inject a Token<() => T> or Token<(cfg) => T> and let call-sites create as-needed, optionally registering them with a manager.
- Collection tokens: inject Token<T[]> or Token<Map<string, T>> when the collection itself is the dependency.

Orchestrator integration
- Register components and dependencies using the Orchestrator, then start/stop/destroy.
  
  ```ts
  import { Orchestrator, createToken, Container, Adapter } from '@orkestrel/core'
  
  class Service extends Adapter { /* lifecycle hooks */ }
  const ServiceTok = createToken<Service>('Service')
  
  const root = new Container()
  const orch = new Orchestrator(root)
  
  orch.register(ServiceTok, { useFactory: () => new Service() })
  await orch.startAll()
  // ...
  await orch.stopAll()
  await orch.destroyAll()
  ```
- Dependencies and order:
  - Register dependencies explicitly; the Orchestrator will start in topological order and stop/destroy in reverse order.
  - Orchestrator disallows async providers (Promises) — perform async work in lifecycle hooks (onStart/onStop/onDestroy) or pre-resolve values.

Async work and timeouts
- Async work should live in Lifecycle hooks, not in providers.
- The Orchestrator supports per-component timeouts for phases:
  
  ```ts
  await orch.start([
    { token: ServiceTok, provider: { useFactory: () => new Service() }, timeouts: { onStart: 5000 } },
  ])
  ```

Edge cases and best practices
- Value providers with Lifecycle:
  - The container won’t destroy value-provided lifecycles on container.destroy(). If you orchestrate them, destroyAll will handle it; otherwise, manage disposal yourself or switch to factory/class providers to transfer ownership to the container.
- Avoid bare values for async guard clarity:
  - Prefer useValue over passing a bare value so the Orchestrator can reliably guard against Promises during registration.
- Prefer useFactory to keep classes container-agnostic:
  - Reserve useClass for intentional container-aware types that accept Container in their constructor (e.g., Adapters). For typical classes, inject dependencies as constructor params and wire with useFactory.
- Scopes:
  - Use child containers to implement request/job-level scoping. Register scoped singletons in the child; destroy the child to clean up.
- Transients:
  - Model transients via factory tokens (() => T), and place lifecycleful transients under a manager if they need start/stop/destroy.

FAQ
- Can I register multiple providers to the same token?
  - Not currently. Use a manager/composite, multiple explicit tokens, or a collection token if you need many.
- Can providers be async?
  - No. Providers must be synchronous; move async work to lifecycle hooks or pre-resolve values before registration.
- How do I get per-request instances?
  - Create a child container per request and register providers there. Or inject a factory token and create instances on demand.

