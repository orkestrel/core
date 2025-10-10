# Core

This page covers the runtime building blocks that ship with Orkestrel Core. It focuses on concepts and usage, not API signatures. Refer to the Typedoc in docs/api for the full API surface.

What’s included
- Logger: a minimal logging port and default adapters
- Diagnostics: structured errors and telemetry helpers
- Emitter: a tiny event emitter
- Event bus: async publish/subscribe with backpressure options
- Queue: run tasks with concurrency limits, deadlines, and per-task timeouts
- Layering: compute dependency layers and group tokens by layer
- Registry: named instance registry used for global container/orchestrator helpers

Logger
- LoggerPort: `log(level, message, fields?)` with levels `debug|info|warn|error`.
- Default adapters:
  - LoggerAdapter: logs to console (or any target you adapt)
  - NoopLogger: swallows logs; useful in tests
- You can pass your logger via options to Container, Orchestrator, Lifecycle, and adapters.

Diagnostics
- DiagnosticPort adds higher-level telemetry:
  - `error(err, context?)` — report an error with scope, code, token, phase, etc.
  - `fail(key, context?)` — throw an Error prefilled with a code (e.g., ORK1006) and optional help URL
  - `aggregate(key, details, context?)` — throw an aggregate Error with lifecycle detail entries
  - `help(key, context?)` — create an Error with code and helpUrl without throwing
  - `metric`, `trace`, `event` — send structured telemetry
- DiagnosticAdapter turns message keys like `ORK1013` into named, stable errors and emits telemetry through the configured Logger.
- Codes used across core include:
  - Container: ORK1005, ORK1006, ORK1016
  - Orchestrator: ORK1007–ORK1015 (duplicates, unknown deps, cycles, async provider guards, phase aggregates)
  - Lifecycle: ORK1020–ORK1022 (invalid transitions, hook timeout/failure)
  - Ports/Queue/Internal: ORK1040/ORK1050–ORK1053/ORK1099

Emitter
- A tiny type-safe emitter with `on`, `off`, `emit`, and `removeAllListeners`.
- Used by Lifecycle to emit `transition`, `create`, `start`, `stop`, `destroy`, and `error`.

Event bus
- A simple pub/sub interface (`publish`, `subscribe`, `topics`) with options:
  - sequential delivery vs best-effort parallel
  - error handling callback
- Great for component-level messages that are not strict dependencies.

Queue
- Run an array of tasks with options: `concurrency`, `timeout`, `deadline`, and `signal`.
- The default QueueAdapter is used by Lifecycle to enforce one-at-a-time hooks with a shared deadline.
- In the orchestrator, you can inject a queue to cap per-layer parallelism.

Layering
- Given nodes `{ token, dependencies }`, compute layers such that dependencies appear in earlier layers.
- The orchestrator uses this to determine safe start/stop/destroy order.

Registry
- A named-instance registry with `get`, `resolve`, `set`, `clear`, and `list`.
- The global helpers `container()` and `orchestrator()` are built on registries to support named instances.

Practical tips
- Pass a `NoopLogger` and rely on codes in tests to keep output clean while asserting behaviors.
- Consider injecting your own queue into Orchestrator to cap start/stop/destroy parallelism for IO-heavy components.
- Use the `events` callbacks for user-facing notifications and the `tracer` for structured capture of layers and outcomes.
- Keep adapter implementations small and focused; only override the Lifecycle hooks you actually need.
