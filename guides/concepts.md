# Concepts

This section explains the core ideas you'll use day to day: tokens, adapters, the container, lifecycle, and the orchestrator.

Tokens and ports
- Tokens are symbols that carry a type parameter. Create them via `createToken('desc')`.
- Ports are named groups of tokens. Create many with `createPortTokens({ ... })` or one with `createPortToken('name')`.
- Use tokens as keys to register and resolve implementations while keeping strong typing and loose coupling.

Adapters and the Singleton Pattern
- All components must extend the `Adapter` base class
- Each Adapter subclass maintains its own singleton instance via `static instance?: AdapterClass`
- Lifecycle management is done through static methods:
  - `MyAdapter.getInstance()` - Get or create the singleton
  - `MyAdapter.start()` - Start the singleton
  - `MyAdapter.stop()` - Stop the singleton
  - `MyAdapter.destroy()` - Destroy and clear the singleton
  - `MyAdapter.getState()` - Get current lifecycle state
- Override protected hooks in your subclass: `onCreate`, `onStart`, `onStop`, `onDestroy`
- The Container stores Adapter classes, not instances. When you resolve a token, the Container returns the singleton instance from the Adapter class.

Container
- Register Adapter classes:
  - `register(token, { adapter: AdapterClass })` - Register an Adapter class for a token
  - `resolve(token)` - Get the singleton instance from the registered Adapter class; throws if missing
  - `get(token)` - Optional resolution; returns undefined for missing entries
- Dependencies:
  - Specify explicitly when registering: `{ adapter: MyClass, dependencies: [TokenA, TokenB] }`
  - Dependencies ensure proper ordering in the Orchestrator
- Scoping:
  - `createChild()` - Inherit registrations, override locally
  - `using(fn)` - Run in a child scope, automatically destroyed afterwards
  - `using(apply, fn)` - Configure the child scope via apply, then run fn
- Cleanup:
  - `destroy()` - Call destroy() on all registered Adapter classes deterministically; aggregates errors if any

Lifecycle and Adapter
- `Adapter` provides a deterministic state machine with states: created → started → stopped → destroyed.
- Each Adapter subclass has its own singleton instance accessed via static methods
- Override hooks: `onCreate`, `onStart`, `onStop`, `onDestroy`, and the optional `onTransition(from, to, hook)`.
- Timeouts cap each hook; default is 5000ms. Set via constructor options.
- Events: `MyAdapter.on('transition'|'create'|'start'|'stop'|'destroy'|'error', fn)` for singleton events.
- Static methods manage the singleton lifecycle while instance hooks define the behavior

Orchestrator
- Purpose: start, stop, destroy many Adapter singletons in a dependency-safe order.
- Register Adapter classes in the Container:
  - `container.register(token, { adapter: AdapterClass, dependencies: [A, B] })`
  - The Orchestrator resolves dependencies and manages start/stop/destroy order
- Dependencies:
  - Provide explicitly as `dependencies: [A, B]` when registering
  - Cycles are detected and rejected (ORK1009)
- Phases:
  - `start()` runs per-layer, topological order; rolls back by stopping already-started singletons on failure
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
- `container()` returns the default container (or named ones via `container('name')`). It also exposes `resolve/get/using` to work with the active container without threading it through your code.
- `orchestrator()` returns the default orchestrator (or named). Use `orchestrator.using(...)` to run work within its container scope.

Error codes at a glance
- ORK1006: container missing provider
- ORK1007: orchestrator duplicate registration
- ORK1008: orchestrator unknown dependency
- ORK1009: orchestrator cycle detected
- ORK1013/1014/1017: aggregated phase errors (start/stop/destroy)
- ORK1020/1021/1022: invalid lifecycle transition / hook timed out / hook failed

See also
- Start: a 5‑minute tour and installation
- Core: built-in adapters and runtime pieces
- Examples: copy‑pasteable snippets for common patterns
- Tips: adapter patterns, composition, and troubleshooting
- Tests: setting up fast, deterministic tests
- FAQ: quick answers from simple to advanced scenarios

API reference is generated separately; see docs/api/index.md (Typedoc).
