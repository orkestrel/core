# Concepts

This section explains the core ideas you’ll use day to day: tokens, providers, the container, lifecycle, and the orchestrator.

Tokens and ports
- Tokens are symbols that carry a type parameter. Create them via `createToken('desc')`.
- Ports are named groups of tokens. Create many with `createPortTokens({ ... })` or one with `createPortToken('name')`.
- Use tokens as keys to register and resolve implementations while keeping strong typing and loose coupling.

Providers and injection
- A provider can be one of:
  - Value: `{ useValue }`
  - Factory: `{ useFactory }` with optional inject
  - Class: `{ useClass }` with optional inject
- Injection styles:
  - Tuple: `inject: [A, B]` calls `useFactory(a, b)` or `new useClass(a, b)`
  - Object: `inject: { a: A, b: B }` calls `useFactory({ a, b })` or `new useClass({ a, b })`
  - Container: omit inject and accept the `Container` as first arg
  - No deps: omit inject and use a zero-arg factory/constructor
- Important: Providers are synchronous. Avoid async functions and promises in providers. Do async work inside lifecycle hooks.

Container
- Register then resolve:
  - `register(token, provider, lock?)` — set a provider for a token; optionally lock it against changes
  - `set(token, value, lock?)` — shorthand for value providers
  - `resolve(token | { map } | [tuple])` — strict; throws when a token is missing
  - `get(token | { map } | [tuple])` — optional; returns undefined for missing entries
- Scoping:
  - `createChild()` — inherit providers, override locally
  - `using(fn)` — run in a child scope, automatically destroyed afterwards
  - `using(apply, fn)` — configure the child scope via apply, then run fn
- Cleanup:
  - `destroy()` — stop/destroy owned lifecycle instances deterministically; aggregates errors if any

Lifecycle and Adapter
- `Lifecycle` is an abstract state machine with states: created → started → stopped → destroyed.
- Override hooks: `onCreate`, `onStart`, `onStop`, `onDestroy`, and the optional `onTransition(from, to, hook)`.
- Timeouts cap each hook; default is 5000ms. Set via constructor options.
- Events: `on('transition'|'create'|'start'|'stop'|'destroy'|'error', fn)`.
- `Adapter` extends `Lifecycle` and is a convenient base for components you register in the container.

Orchestrator
- Purpose: start, stop, destroy many components in a dependency-safe order.
- Register components via:
  - `orchestrator.register(token, provider, deps?, timeouts?)` for ad-hoc registration
  - `register(token, provider, options?)` to build typed entries for `orchestrator.start([...])`
- Dependencies:
  - Provide explicitly as `[A, B]` or `{ a: A, b: B }` on options
  - Or omit and let the orchestrator infer from tuple/object inject shapes
  - Cycles are detected and rejected
- Phases:
  - `start()` runs per-layer, topological order; rolls back by stopping already-started components on failure
  - `stop()` runs in reverse order; aggregates errors (ORK1014)
  - `destroy()` stops (if needed) then destroys; aggregates errors (ORK1017) and includes container cleanup
- Timeouts:
  - Per-orchestrator defaults via options, or per-registration overrides
  - Per-phase numbers or `{ onStart, onStop, onDestroy }`
- Telemetry:
  - `events` callbacks: onComponentStart/Stop/Destroy/Error
  - `tracer`: `onLayers` and `onPhase` for structured insights
  - Diagnostics emit event/trace/metric hooks and stable error codes

Global helpers
- `container()` returns the default container (or named ones via `container('name')`). It also exposes `set/clear/list/resolve/get/using` to work with the active container without threading it through your code.
- `orchestrator()` returns the default orchestrator (or named). Use `orchestrator.using(...)` to run work within its container scope.

Error codes at a glance
- ORK1006: container missing provider
- ORK1007: orchestrator duplicate registration
- ORK1008: orchestrator unknown dependency
- ORK1009: orchestrator cycle detected
- ORK1010/1011/1012: async provider inputs (value, async function, returned Promise)
- ORK1013/1014/1017: aggregated phase errors (start/stop/destroy)
- ORK1020/1021/1022: invalid lifecycle transition / hook timed out / hook failed

See also
- Start: a 5‑minute tour and installation
- Core: built-in adapters and runtime pieces
- Examples: copy‑pasteable snippets for common patterns
- Tips: provider patterns, composition, and troubleshooting
- Tests: setting up fast, deterministic tests
- FAQ: quick answers from simple to advanced scenarios

API reference is generated separately; see docs/api/index.md (Typedoc).
