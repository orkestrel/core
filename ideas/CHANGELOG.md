# Changelog

All notable API changes to @orkestrel/core.

## Unreleased

- Placeholder for upcoming changes.

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
