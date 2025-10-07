# FAQ and Troubleshooting

A quick reference for common issues, their causes, and concise remedies. Error codes are stable across releases.

## Async providers are not allowed (ORK1010–ORK1012)
Symptoms
- You returned a Promise from `useValue` or `useFactory`, or used an `async` factory.

Why
- Providers must be synchronous. Async work belongs in lifecycle hooks (`onStart`, `onStop`, `onDestroy`).

Fix
- Move IO/async setup from the provider into `onStart()` of a `Lifecycle` class, or do it lazily after resolution.

## Unknown dependency (ORK1008)
Symptoms
- `Unknown dependency` or similar diagnostic when starting.

Why
- You referenced a token in `dependencies` (or indirectly via module composition) that hasn’t been registered.

Fix
- Ensure the token is registered before it’s depended on. If using `register(...)`, pass the missing dependency as part of the orchestrator registrations.

## Cycle detected (ORK1009)
Symptoms
- `Cycle detected` during start.

Why
- The dependency graph contains a cycle: A depends on B depends on A (or a longer loop).

Fix
- Break the cycle by splitting responsibilities, inverting a call, or introducing a small mediator/port.

## Lifecycle hook timeout (ORK1021)
Symptoms
- A start/stop/destroy hook exceeds configured timeout and fails.

Why
- `timeouts` on `Lifecycle` caps hook runtime, and orchestrator timeouts (`onStart`, `onStop`, `onDestroy`) cap per-component lifecycles.

Fix
- Reduce the work per hook or increase timeouts (either per component or via orchestrator defaults). Favor fast fail for critical paths.

## When to use `stop()` vs `destroy()`
- `stop()` stops all started components (reverse dependency order). Use it for graceful pause/restart scenarios.
- `destroy()` performs a full shutdown: stops components as needed, then destroys them in one pass, and finally destroys the container. Prefer this for app teardown.

## Scoping and many instances (no transient lifetime)
- All providers are singletons by design. For request/job scoping, use `container.createChild()` (or `container.using(fn)`) and destroy the scope afterward.
- For many instances, model a Manager singleton that owns internal child lifecycles and resolves per-instance resources on demand.

## Tracing and events
- Wire `OrchestratorOptions.events` to capture per-component start/stop/destroy durations and errors.
- Enable the tracer (`tracer.onLayers`, `tracer.onPhase`) to see dependency layers and per-phase outcomes for debugging.

See also
- Tips → Tracing and events examples: [docs/tips.md](./tips.md)
- API Reference → Orchestrator options: [docs/api.md](./api.md#interface-orchestratoroptions)
