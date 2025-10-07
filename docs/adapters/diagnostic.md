# Diagnostics Adapter

A single pluggable adapter to centralize logging, metrics, telemetry (traces/events), and error reporting across the core package.

- Interface: `DiagnosticsPort` in `src/types.ts`
- Default global: a no-op adapter (quiet by default)
- Provided implementations: `NoopDiagnosticsAdapter` and `ConsoleDiagnosticsAdapter`

## Goals

- Uniform, structured diagnostics across lifecycle, orchestrator, and container
- Tiny surface area that is easy to implement for other backends (e.g., Sentry, OpenTelemetry, DataDog)
- Safe by default: adapter errors are swallowed to avoid impacting core flow

## Interface

```
interface DiagnosticsPort {
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, fields?: Record<string, unknown>): void
  error(err: unknown, context?: DiagnosticsErrorContext): void
  metric(name: string, value: number, tags?: Record<string, string | number | boolean>): void
  trace(name: string, payload?: Record<string, unknown>): void
  event(name: string, payload?: Record<string, unknown>): void
}
```

`DiagnosticsErrorContext` includes optional fields like `scope`, `code`, `token`, `phase`, `hook`, `timedOut`, and `durationMs` to make errors easier to triage downstream.

## Usage

- The core package uses a global diagnostics adapter accessible via:

```
import { getDiagnostics, setDiagnostics } from '@orkestrel/core'
```

- By default, a `NoopDiagnosticsAdapter` is used (no output).
- To start logging to the console:

```
import { ConsoleDiagnosticsAdapter, setDiagnostics } from '@orkestrel/core'

setDiagnostics(new ConsoleDiagnosticsAdapter())
```

- Or implement your own adapter by implementing `DiagnosticsPort` and plugging it in with `setDiagnostics()`.

## Integration points

- Lifecycle transitions and hooks emit events and errors into the diagnostics adapter
- Orchestrator emits layer/phase traces, component start/stop/destroy events, and aggregates errors with codes (e.g., ORK1013/1014/1017)

Adapter calls are wrapped in `try/catch` and errors are swallowed to keep orchestration stable.

