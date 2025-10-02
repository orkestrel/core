# Changelog

All notable API changes to @orkestrel/core.

## Unreleased

- Orchestrator options (public): Added `tracer` hooks (`onLayers`, `onPhase`) and a per-layer `concurrency` cap. Defaults remain unchanged and there is zero overhead when tracer is not provided.
- Container API (public): Added `using(apply, fn)` overload to create a child scope, apply overrides, run work, and always destroy the scope.
- Typing (public types only, no runtime change):
    - Improved `orchestrator.register` overloads to preserve tuple/object `inject` inference for `useClass`/`useFactory`, fixing TS2322 when registering classes with constructor dependencies.
    - Added precise `orchestrator.start` overloads: `start()` and `start(regs: OrchestratorRegistration<unknown>[])`, enabling strictly-typed direct registration objects (including `useClass` + tuple `inject`) without any.
- Docs/API: Aligned `docs/api.md` with the new options and overloads; added examples for tuple/object `inject` and clarified strict typing (no `any`).
- Examples: Added `examples/web-server.ts` and `examples/worker.ts` demonstrating Lifecycle around an HTTP server and a periodic worker. New scripts: `npm run example:web`, `npm run example:worker`. Added `docs/examples.md` overview.
- Tests: Added property-based orchestrator tests that generate random DAGs to verify topological start/stop order and rollback invariants. Consolidated into `tests/orchestrator.test.ts` (no separate files); implemented with a tiny internal seeded PRNG; no new dependencies.

- Docs: Updated `ideas/ideas.md` roadmap item 16 to Done with implementation details and documented the one-test-file-per-source convention. No API changes.
- Docs/API: Added TSDoc across core public APIs (container, orchestrator, ports, emitter) and aligned `docs/api.md` with source comments. No runtime changes.
- Examples: Added `examples/web-server.ts` and `examples/worker.ts` demonstrating Lifecycle around an HTTP server and a periodic worker. New scripts: `npm run example:web`, `npm run example:worker`. Added `docs/examples.md` overview.
- Typing: Improved `orchestrator.register` with overloads that preserve tuple/object `inject` inference for `useClass`/`useFactory`, fixing TS2322 when registering classes with constructor dependencies. Documented overloads in `docs/api.md` and added a test.

## 1.3.0 — 2025-10-01

Lifecycle API consolidation and simpler shutdown.

Highlights
- Orchestrator lifecycle methods unified
  - `start(regs?)` now registers any provided components and starts all lifecycles in dependency order (previously via `startAll`).
  - `stop()` replaces `stopAll()` and stops started components in reverse dependency order.
  - `destroy()` replaces `destroyAll()` and performs a single consolidated pass: stops components as needed, then destroys them, and finally destroys the container.
- Diagnostics messages harmonized
  - Start aggregation: ORK1013 “Errors during start”.
  - Stop aggregation: ORK1014 “Errors during stop”.
  - Destroy aggregation: ORK1017 “Errors during destroy”.
- Docs and examples updated
  - Examples now use `start([...])` for boot and a single `destroy()` for shutdown.
  - Guidance added on when to use `stop()` vs `destroy()`.

Migration
- Replace method calls:
  - `startAll()` ➜ `start()`
  - `stopAll()` ➜ `stop()`
  - `destroyAll()` ➜ `destroy()`
- For shutdown, call just `destroy()`; you no longer need to call `stop()` first.
- If you assert on error messages in tests, update expectations to the new messages (codes unchanged):
  - “Errors during startAll” ➜ “Errors during start” (ORK1013)
  - “Errors during stopAll” ➜ “Errors during stop” (ORK1014)
  - “Errors during destroyAll” ➜ “Errors during destroy” (ORK1017)

Notes
- Topological start order and reverse-order stop/destroy semantics remain unchanged.
- Per-component and default timeouts still apply per phase.

## 1.2.1 — 2025-10-01

This patch refines typing and documentation for a better developer experience without breaking APIs.

Highlights
- Container typing and register ergonomics
  - Introduced three concise register forms (inference-friendly):
    1) Tuple/Object inject forms
       - Factory with positional injection: `{ useFactory: (...args), inject: [TokA, TokB] }`
       - Factory with named-object injection: `{ useFactory: (deps), inject: { a: TokA, b: TokB } }`
       - Class with positional injection: `{ useClass: Ctor, inject: [TokA, TokB] }`
    2) No-deps forms
       - Factory: `{ useFactory: () => T }` or `{ useFactory: (c: Container) => T }`
       - Class: `{ useClass: Ctor }` where `Ctor` is `new () => T` or `new (c: Container) => T`
         - The container inspects constructor arity and passes the container when `Ctor.length >= 1`.
    3) Value forms
       - `{ useValue: value }` or bare value `T`.
  - Strong typing across the container: eliminated `any` and minimized type assertions by using correlated types for `inject` shapes.
  - Exported and retained provider type guards: `isValueProvider`, `isFactoryProvider`, `isClassProvider`.

- Diagnostics & Errors
  - Centralized diagnostics with stable codes and `[Orkestrel][CODE]` prefixes remain the standard across the library.
  - Error types carry optional `code` and `helpUrl` to aid logging, testing, and troubleshooting.
  - Async provider guard is enforced: `useValue` must not be a Promise, and `useFactory` must be synchronous and must not return a Promise; violations throw at registration.
  - `AggregateLifecycleError` continues to aggregate component errors with uniform details for orchestrator/container cleanup.
  - This patch did not change diagnostics behavior; documentation has been expanded for clarity.

- New exported types
  - `InjectTuple<A extends readonly unknown[]>`
  - `InjectObject<O extends Record<string, unknown>>`
  These clarify injection shapes and keep compile-time safety from `inject` through construction.

- Documentation updates
  - API: documented the three register forms and inject helpers.
  - Patterns: expanded explicit injection guidance; added a class provider example that takes `Container` explicitly.
  - Examples: added a concise cheat sheet for register forms; documented arity-based container passing for classes.
  - Providers & Lifetimes: aligned provider forms with stricter, friendlier typings.

- Quality gates
  - Type-check and ESLint pass with no rule suppressions (including unified-signatures).
  - All tests pass.

Migration
- No breaking changes. Existing registrations keep working.
- If you previously relied on loose typing in `inject` forms, you may now see earlier (and helpful) type errors where shapes don’t match constructor/factory parameters.

## 1.2.0 — 2025-10-01

This release clarifies strict vs optional resolution, introduces sensible defaults for the global helpers, and improves ergonomics for resolving multiple tokens at once. It also adds scoped container usage and enhances the `register` helper.

### Breaking changes

- Container
  - `get(token)` is now optional and may return `undefined` when a token is not registered.
  - `resolve(token)` is the strict alternative that throws when a token is not registered.
  - Both `get` and `resolve` support object-map overloads for resolving multiple tokens at once.
- Registry
  - `get(name?)` is now optional and may return `undefined` when a value is not registered.
  - `resolve(name?)` is the strict alternative that throws when a value is not registered.
  - `tryGet(...)` has been removed; use `get(...)` instead.
- Helpers
  - Orchestrator helper setter signature changed to `set(name, orchestrator, lock?)` to match the container helper (was `set(orchestrator, name?, opts?)`).

### New and improved APIs

- Global helpers (auto-registered defaults)
  - `container()` has a default Container instance auto-registered under a symbol key at module load.
  - `orchestrator()` has a default Orchestrator instance auto-registered and bound to the default Container.
- Container
  - `using(fn)` — run work in an automatically-destroyed child scope for safe, concise scoping.
- Helper: `register` (kept and enhanced)
  - Overloads:
    - `register(token, provider)`
    - `register(token, provider, { dependencies, timeouts })`
  - Dependencies may be provided as an object-map; they are de-duplicated by token key and self-dependency is filtered out.
  - Optional per-registration `timeouts` can be supplied.

### Migration guide

- Replace strict usages of `get(token)` with `resolve(token)` in your app code and tests.
- Replace `Registry.tryGet(...)` with `Registry.get(...)`; use `Registry.resolve(...)` where strict behavior is required.
- Update calls to `orchestrator.set(...)` to use the new parameter order: `orchestrator.set(name, instance)`; use named keys rather than replacing the default.
- For resolving multiple tokens at once, prefer map resolution:
  - Strict: `container().resolve({ a: Ports.a, b: Ports.b })`
  - Optional: `container().get({ a: Ports.a, b: Ports.b })`
- Continue using `register(...)` where you compose arrays for `orchestrator().start([...])`; it normalizes dependencies and accepts per-registration `timeouts`.

### Notes

- The orchestrator’s lifecycle behavior and async provider guards are unchanged.
- Named instances for both container and orchestrator remain fully supported.
- No public plan introspection API is exposed in this release.
