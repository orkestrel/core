# FAQ

This FAQ grows in complexity from basic concepts to advanced usage. It complements the guide and keeps API details out of the way. For signatures and full types, see the generated API reference in docs/api/.

Basics

- What is a token?
  - A token is a typed handle (created with createToken or createPortToken/s) you use as a key to register and resolve implementations. It carries only type information and a human description for diagnostics.
  - Example:
    ```ts
    import { Container, createToken } from '@orkestrel/core'
    const T = createToken<number>('answer')
    const c = new Container()
    c.set(T, 42)
    console.log(c.resolve(T)) // 42
    ```

- Value vs factory vs class providers?
  - Value: useValue registers an already-created value. The container does not own its lifecycle.
  - Factory: useFactory constructs the value lazily on first resolve. If it returns a Lifecycle instance, the container owns its stop/destroy.
  - Class: useClass constructs via new on first resolve; ownership mirrors factory.
  - Example:
    ```ts
    import { Container, createToken } from '@orkestrel/core'
    class Svc { n = 1 }
    const TV = createToken<Svc>('svc:value')
    const TF = createToken<Svc>('svc:factory')
    const TC = createToken<Svc>('svc:class')
    const c = new Container()
    c.register(TV, { useValue: new Svc() })
    c.register(TF, { useFactory: () => new Svc() })
    c.register(TC, { useClass: Svc })
    console.log(c.resolve(TF).n + c.resolve(TC).n + c.resolve(TV).n) // 3
    ```

- Can providers be async?
  - No. Providers must be synchronous. Do async work in Lifecycle hooks (onStart/onStop/onDestroy). Violations are guarded with stable error codes (e.g., ORK1010/1011/1012).

- How do I inject dependencies?
  - Tuple: inject: [A, B] calls factory/constructor as (a, b).
  - Object: inject: { a: A, b: B } calls factory/constructor as ({ a, b }).
  - Container: omit inject and accept the Container as the first argument when applicable.
  - Example:
    ```ts
    import { Container, createToken } from '@orkestrel/core'
    const A = createToken<number>('A'), B = createToken<string>('B'), OUT = createToken<string>('OUT')
    const c = new Container(); c.set(A, 2); c.set(B, 'x')
    c.register(OUT, { useFactory: (a, b) => b + a, inject: [A, B] })
    console.log(c.resolve(OUT)) // 'x2'
    ```

- What happens on missing tokens?
  - resolve throws with ORK1006 (missing provider). Use get if a dependency is optional.
  - Example:
    ```ts
    import { Container, createToken } from '@orkestrel/core'
    const Maybe = createToken<number>('maybe')
    const c = new Container()
    console.log(c.get(Maybe)) // undefined
    // c.resolve(Maybe) // would throw ORK1006
    ```

Intermediate

- How does scoping work?
  - Create a child with createChild() or use using(...) to run work in a short-lived scope. Child containers inherit providers and can override them; when the scope ends, owned lifecycles are deterministically destroyed.
  - Example:
    ```ts
    import { Container, createToken } from '@orkestrel/core'
    const T = createToken<number>('T')
    const root = new Container(); root.set(T, 1)
    const out = await root.using(async (scope) => { scope.set(T, 41); return scope.resolve(T) + 1 })
    console.log(out, root.resolve(T)) // 42 1
    ```

- When should I extend Adapter vs raw Lifecycle?
  - Prefer Adapter for components you intend to register in a container and potentially orchestrate. Use Lifecycle directly for custom state machines or when you do not need adapter conveniences.
  - Example:
    ```ts
    import { Adapter, Container, createToken } from '@orkestrel/core'
    class Cache extends Adapter { ready = false; protected async onStart(){ this.ready = true } protected async onStop(){ this.ready = false } }
    const TCache = createToken<Cache>('cache'); const c = new Container(); c.register(TCache, { useFactory: () => new Cache() })
    const cache = c.resolve(TCache); await cache.start(); console.log(cache.ready); await cache.stop(); await c.destroy()
    ```

- How are orchestrator dependencies determined?
  - Explicit: declare dependencies in the register(...) options. Inferred: when using tuple/object inject, dependencies can be inferred from tokens. Cycles are rejected with ORK1009.
  - Example:
    ```ts
    import { Orchestrator, Container, Adapter, createToken, register } from '@orkestrel/core'
    class A extends Adapter {} class B extends Adapter {}
    const TA = createToken<A>('A'), TB = createToken<B>('B')
    const app = new Orchestrator(new Container())
    await app.start([
      register(TA, { useFactory: () => new A() }),
      register(TB, { useFactory: () => new B() }, { dependencies: [TA] }),
    ])
    await app.destroy()
    ```

- What if a component fails to start?
  - The orchestrator rolls back: components already started are stopped in reverse dependency order. Failures are aggregated and reported with details.
  - Example idea: set a very small onStart timeout for a slow component and catch the aggregate. See Examples: “per-registration timeouts.”

- How do timeouts work?
  - Each hook has a timeout (default 5000ms). Configure globally on Lifecycle/Orchestrator or per registration with numbers or per-phase overrides: { onStart, onStop, onDestroy }.
  - Example:
    ```ts
    import { Orchestrator, Container, Adapter, createToken, register } from '@orkestrel/core'
    class Slow extends Adapter { constructor(private ms:number){ super() } protected async onStart(){ await new Promise(r=>setTimeout(r,this.ms)) } }
    const TSlow = createToken<Slow>('Slow'); const app = new Orchestrator(new Container())
    try {
      await app.start([ register(TSlow, { useFactory: () => new Slow(50) }, { timeouts: { onStart: 10 } }) ])
    } catch (e) { console.log('start aggregated error'); }
    await app.destroy()
    ```

Advanced

- Multi-tenant or per-request work?
  - Use container.createChild() or container.using() to produce an isolated scope per tenant/request/job. Register overrides within the child, do work, then destroy.

- Global helpers container() and orchestrator()
  - Access a default or named instance without threading references. Use container().using(...) or orchestrator().start([...]) where convenient. Treat these as conveniences over explicit wiring.
  - Example:
    ```ts
    import { container, orchestrator, createToken, Adapter, register } from '@orkestrel/core'
    const TNum = createToken<number>('num'); container().set(TNum, 7)
    console.log(container.resolve(TNum))
    class Svc extends Adapter {}
    const TS = createToken<Svc>('svc')
    const app = orchestrator(); await app.start([ register(TS, { useFactory: () => new Svc() }) ]); await app.destroy()
    ```

- Observability options
  - Diagnostics provide stable error codes and helpers (error, fail, aggregate). Orchestrator exposes events and tracer hooks for layers and phase outcomes. You can swap or adapt logger/diagnostic/queue ports to your stack.

- Controlling concurrency
  - Inject a QueuePort into the orchestrator to cap per-layer parallelism during start/stop/destroy. Use deadlines and per-task timeouts for bounded shutdown.

- Value providers that are lifecycles
  - The container treats useValue as externally owned. If you pass a Lifecycle instance via useValue, you are responsible for stopping/destroying it; prefer factory/class providers so the container owns disposal.

Troubleshooting (by symptom)

- I get a missing provider error
  - Check token registration and resolution scope. Use get for optional dependencies. Code: ORK1006.

- Something times out during start/stop/destroy
  - Reduce work within hooks, increase timeouts sparingly, or adjust orchestrator queue concurrency. Codes: ORK1021 (hook timeout) and aggregated ORK1013/1014/1017.

- Duplicate registration in orchestrator
  - Ensure each token is registered once per start() call. Code: ORK1007.

- Unknown dependency or cycle detected
  - Declare all dependencies; break cycles by splitting responsibilities or inverting calls. Codes: ORK1008 (unknown), ORK1009 (cycle).

- Async providers rejected
  - Keep providers sync; move IO to lifecycle hooks or pre-resolve values. Codes: ORK1010/1011/1012.

Recipes

- Scoped override for a test or job
  - container.using(apply, fn) lets you stage overrides then run work in a child; the scope auto-destroys afterward.

- Per-component timeouts
  - Provide timeouts on a registration: { timeouts: { onStart: 50, onStop: 50 } } to bound slow components.

- Observing transitions
  - Lifecycle emits transition events; attach listeners for create/start/stop/destroy/error to integrate with logs/metrics.

Pointers

- Start here: Overview and Start pages for the mental model and a five-minute tour.
- Deep dive: Concepts for tokens/providers/lifecycle/orchestration; Core for built-in adapters.
- Copy-paste: Examples for common patterns; Tips for composition and troubleshooting.
- API details live in docs/api/ (generated by TypeDoc).
