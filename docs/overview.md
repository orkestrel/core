# Overview

Orkestrel Core is a minimal, strongly-typed adapter/port framework for TypeScript. It centers on:

- Ports: interfaces describing capabilities (Email, Logger, etc.)
- Tokens: unique runtime identifiers for those port interfaces
- Adapters: implementations that satisfy ports (swap for different environments)
- Container: a small DI container to register and resolve components
- Orchestrator: deterministic lifecycle ordering with dependencies
- Lifecycle: safe transitions with timeouts and events

Highlights
- TypeScript-first, ESM-only
- Works in Node and the browser
- No heavy dependencies
- Strict DI, explicit wiring

Defaults and helpers
- A default `Container` and `Orchestrator` are auto-registered under symbol keys and accessible via `container()` and `orchestrator()`.
- Named instances are supported: `container.set('tenant:A', new Container())`, then `container('tenant:A')`.

Resolve vs Get
- `resolve(token | map)` is strict and throws if a token is missing; `get(token | map)` is optional and returns `undefined` for missing tokens.

Inject vs Dependencies (at a glance)
- `inject` (provider-level) tells the Container how to pass constructor/factory arguments by resolving tokens.
- `dependencies` (orchestrator-level) tells the Orchestrator which tokens must start first; it affects lifecycle ordering and rollback.
- They’re complementary; use both for the same component when needed. The orchestrator doesn’t infer `dependencies` from `inject`.

Errors
- All framework errors include stable codes like `[Orkestrel][ORK####] Message…` and often a short help link.
- Aggregated lifecycle failures throw an `AggregateLifecycleError` with per-component details.

Startup
- See [Start](./start.md) for the canonical boot pattern, and [Patterns](./patterns.md) for alternatives and when to use them.

Adapters
- Emitter: see [docs/emitter.md](adapters/emitter.md)
- Event: see [docs/event.md](adapters/event.md)
- Queue: see [docs/queue.md](adapters/queue.md)
- Layer: see [docs/layer.md](adapters/layer.md)

Notes
- Lifecycle uses EmitterAdapter internally for its own events.
- Event is a separate, typed pub/sub adapter for application topics.
- Orchestrator composes bounded concurrency using QueueAdapter.
