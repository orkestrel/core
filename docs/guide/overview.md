# Orkestrel Core overview

Orkestrel Core is a minimal, strongly-typed toolkit for composing applications with ports and adapters in TypeScript. It gives you:

- Tokens and ports for decoupled contracts
- A tiny dependency injection container for wiring
- A deterministic Lifecycle to start/stop/destroy components
- An Orchestrator that drives many components in dependency order
- Small built-in adapters for registry, queue, emitter, events, layers, diagnostics, and logging

What it is not: a framework with hidden runtime magic. You assemble tokens and providers explicitly, keep providers synchronous, and move async work into lifecycle hooks.

Highlights
- Strong typing end-to-end with token contracts
- Synchronous provider model: factories/values must not be async (enforced)
- Deterministic lifecycle with hook timeouts and rollback on failures
- Topological start/stop/destroy with per-layer concurrency control
- Global helpers for multi-tenant scenarios: `container()` and `orchestrator()`

Key building blocks
- Tokens and ports: Create tokens with `createToken` or `createPortTokens`/`createPortToken` to model contracts.
- Providers: Register values, factories, or classes. Inject dependencies as a tuple `[A, B]` or object `{ a: A, b: B }`, or accept the `Container` directly. Providers must be synchronous.
- Lifecycle and Adapter: Extend `Lifecycle` or `Adapter` and override hooks (`onCreate`, `onStart`, `onStop`, `onDestroy`, `onTransition`).
- Container: Register tokens to providers, resolve single tokens or maps/tuples, create child scopes, and deterministically destroy owned lifecycles.
- Orchestrator: Register component providers with dependencies and optional timeouts, then `start`, `stop`, and `destroy` in dependency order with safe rollback.
- Built-in adapters: lightweight defaults for logger, diagnostics, event emitters, event bus, layers (topological grouping), queue (concurrency/timeouts), and registries (named instances).

Diagnostics and telemetry
- Failures carry stable codes like ORK1006 (missing provider), ORK1013/1014/1017 (phase aggregates), ORK1021/1022 (hook timeout/failure).
- You can observe lifecycle transitions, orchestrator phases, and component events via callbacks, tracer hooks, and diagnostics events.

Where to go next
- Start: install and a 5-minute tour
- Concepts: tokens, providers, lifecycle, and orchestration
- Core: built-in adapters and runtime pieces without API minutiae
- Examples: small, copy-pasteable snippets
- Tips: provider patterns, testing guidance, and common gotchas
- Tests: how to test components and orchestrations effectively

API reference is generated separately; see docs/api/index.md (Typedoc).
