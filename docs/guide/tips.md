# Tips

A practical grab bag: provider patterns, lifetimes, typing conventions, composition patterns, and troubleshooting. It consolidates the previous types, patterns, providers-and-lifetimes, and FAQ pages.

Provider shapes and injection

- Value: `{ useValue }` — external ownership; container won’t destroy it automatically.
- Factory: `{ useFactory }` — lazy singleton; container owns disposal for Lifecycle instances.
- Class: `{ useClass }` — lazy singleton; container owns disposal for Lifecycle instances.
- Injection styles:
  - Tuple: `inject: [A, B]` → `(a, b)` or `new C(a, b)`
  - Object: `inject: { a: A, b: B }` → `({ a, b })` or `new C({ a, b })`
  - Container: no inject; factory/ctor receives `Container` as first parameter when applicable
  - No deps: zero-arg factory/ctor
- Synchronous only: `useValue` must not be a Promise; `useFactory` must not be async and must not return a Promise. Move IO to lifecycle hooks.

Lifetimes and ownership

- Singleton by design per container; first resolve materializes and caches.
- Scope per request/job with `createChild()` or `using(...)`, then `await scope.destroy()`.
- Container.destroy(): stops started lifecycles and destroys owned lifecycles from factory/class providers; value-provided lifecycles are considered externally owned.
- Many instances: use a Manager (an Adapter) that owns children internally and exposes a single lifecycle to the orchestrator.

Typing guidelines

- Create tokens via `createToken<T>(desc)` or groups via `createPortTokens(shape)` and extend with `extendPorts(base, ext)` (duplicate keys are rejected).
- Prefer explicit types and `readonly` public shapes. Avoid `any` and non-null assertions.
- Narrow using guards like `isFactoryProviderWithTuple/Object`, `isClassProviderWithTuple/Object`, `isToken`, and `isProviderObject` rather than casting.
- Treat token maps as configuration; they’re frozen read-only objects.

Composition patterns

- Startup with register helper:

  ```ts
  await app.start([
    register(TLogger, { useFactory: () => new Logger() }),
    register(TEmail, { useFactory: () => new Email() }, { dependencies: [TLogger] }),
  ])
  ```

- Explicit dependencies control lifecycle ordering; inject controls constructor/factory arguments. Use both when needed.
- Use orchestrator defaults for timeouts; override per component when necessary.
- Lock critical providers with `register(token, provider, true)` or `set(token, value, true)` to prevent accidental overrides.
- Use `container.using(apply, fn)` to stage scoped overrides then run work; the scope auto-destroys.

Tracing and events

- Orchestrator `events` are convenient for logs and metrics; `tracer` gives structured insight into layers and phase outcomes.
- Lifecycle `on('transition'|'start'|'stop'|'destroy'|'error')` lets you observe state changes; filter in `onTransition` when you only care about some hooks.

Troubleshooting (stable error codes)

- ORK1006 Missing provider: ensure the token was registered or use `get` instead of `resolve` when optional.
- ORK1007 Duplicate registration: don’t register the same token twice in one orchestrator.
- ORK1008 Unknown dependency: declare all dependencies and register them before start.
- ORK1009 Cycle detected: break cycles by splitting responsibilities or inverting a call.
- ORK1010/1011/1012 Async provider guards: keep providers sync; move async to lifecycle hooks or pre-resolve values.
- ORK1013/1014/1017 Aggregated start/stop/destroy errors: catch and inspect `.details` (array of per-component failures).
- ORK1020 Invalid lifecycle transition: respect created → started → stopped → destroyed.
- ORK1021 Hook timed out: reduce hook work or increase timeouts.
- ORK1022 Hook failed: handle errors in hooks; they’ll be wrapped and propagated.
- ORK1040 Duplicate port key in `extendPorts`: rename or split the shape.

Testing tips

- Keep hook timeouts small (10–50ms) for fast feedback.
- Avoid mocks in core; use real adapters and assert observable behavior.
- Use `container.using` for scoped tests and ensure cleanup.
- For aggregated errors, use `isAggregateLifecycleError` and assert on `.details`.

Quick references

- Container: `register`, `set`, `resolve`, `get`, `createChild`, `using`, `destroy`
- Lifecycle: override hooks; observe with `on`/`off`; default hook timeout 5000ms
- Orchestrator: `register`, `start`, `stop`, `destroy`; dependencies and per-phase timeouts; `events` and `tracer`
- Ports: `createPortTokens`, `createPortToken`, `extendPorts`
