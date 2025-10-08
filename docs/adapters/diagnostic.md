# Diagnostic Adapter

A single pluggable adapter to centralize logging, metrics, telemetry (traces/events), and error reporting across the core package.

- Interface: `DiagnosticPort` in `src/types.ts`
- Default implementation: `DiagnosticAdapter` (depends only on a `LoggerPort`)
- Logger defaults: `LoggerAdapter` (console) and `NoopLogger`
- Message maps live in `src/diagnostics.ts` and are passed per-domain to keep adapters small and precise.

## Goals

- Uniform, structured diagnostics across lifecycle, orchestrator, container, registry, ports, and queue
- Tiny surface area that is easy to implement or replace
- Safe by default: adapter never throws outward (errors in logging are swallowed)
- Domain-specific message maps with simple composition and overrides

## Interface

```
interface DiagnosticPort {
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, fields?: Record<string, unknown>): void
  error(err: unknown, context?: DiagnosticErrorContext): void
  /** Build, emit, and throw an error using a known key/code (e.g., ORK10xx). */
  fail(key: string, context?: DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }): never
  /** Build (without throwing) an error using a known key/code. */
  help(key: string, context?: DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }): Error
  /** Aggregate lifecycle details or errors; emits then throws the aggregate. */
  aggregate(key: string, details: ReadonlyArray<LifecycleErrorDetail | Error>, context?: DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }): never
  metric(name: string, value: number, tags?: Record<string, string | number | boolean>): void
  trace(name: string, payload?: Record<string, unknown>): void
  event(name: string, payload?: Record<string, unknown>): void
}
```

`DiagnosticErrorContext` includes optional `scope`, `code`, `token`, `phase`, `hook`, `timedOut`, `durationMs`, and `extra` to make errors easy to triage downstream.

## Domain-specific message maps

Instead of one global list, messages are grouped by domain in `src/diagnostics.ts`:

- `LIFECYCLE_MESSAGES`
- `ORCHESTRATOR_MESSAGES`
- `CONTAINER_MESSAGES`
- `REGISTRY_MESSAGES`
- `PORTS_MESSAGES`
- `QUEUE_MESSAGES`
- `INTERNAL_MESSAGES`

Each message entry is `{ key: string, level?: LogLevel, message?: string }`. Keys include both:
- stable event names (e.g., `orchestrator.phase`, `lifecycle.hook`), and
- error codes (e.g., `ORK1013`, `ORK1021`).

Adapters receive the relevant map(s) for their domain.

## Using DiagnosticAdapter directly

Pass a logger and one or more message maps. You can also add ad-hoc overrides.

```ts
import { DiagnosticAdapter } from '@orkestrel/core'
import { LoggerAdapter } from '@orkestrel/core'
import { ORCHESTRATOR_MESSAGES, LIFECYCLE_MESSAGES, INTERNAL_MESSAGES } from '@orkestrel/core'

const logger = new LoggerAdapter()
const diagnostic = new DiagnosticAdapter({
  logger,
  messages: [
    ...ORCHESTRATOR_MESSAGES,
    ...LIFECYCLE_MESSAGES,   // orchestrator can emit lifecycle timeouts via helpers
    ...INTERNAL_MESSAGES,    // covers internal invariants
    // optional overrides win last
    { key: 'orchestrator.phase', level: 'debug' },
  ],
})

diagnostic.event('orchestrator.phase', { layer: 0, phase: 'start', outcomes: [] })
diagnostic.fail('ORK1007', { scope: 'orchestrator', message: 'Duplicate registration' })
```

## How core wires domain maps

Core constructs domain adapters with focused maps:

- Orchestrator: `new DiagnosticAdapter({ messages: [...ORCHESTRATOR_MESSAGES, ...LIFECYCLE_MESSAGES, ...INTERNAL_MESSAGES] })`
- Lifecycle: `new DiagnosticAdapter({ messages: LIFECYCLE_MESSAGES })`
- Container: `new DiagnosticAdapter({ messages: CONTAINER_MESSAGES })`
- Registry: `new DiagnosticAdapter({ messages: REGISTRY_MESSAGES })`
- Queue: `new DiagnosticAdapter({ messages: QUEUE_MESSAGES })`
- Layer: `new DiagnosticAdapter({ messages: ORCHESTRATOR_MESSAGES })`
- Ports helpers: `new DiagnosticAdapter({ messages: PORTS_MESSAGES })`

Event/Emitter adapters can accept a `diagnostic` instance; by default they don’t require domain maps.

## Overriding and extending messages

You can replace level and/or message for any key by passing an override later in the `messages` array:

```ts
new DiagnosticAdapter({
  logger,
  messages: [
    ...CONTAINER_MESSAGES,
    { key: 'ORK1006', level: 'warn', message: 'Provider missing' },
  ],
})
```

## HELP links

Helpful docs links for common failures are exported as `HELP` from `src/diagnostics.ts` and are passed into error contexts in core.

```ts
import { HELP } from '@orkestrel/core'

diagnostic.fail('ORK1006', { helpUrl: HELP.providers })
```

## Safety notes

- Adapter methods catch and swallow any logging failures.
- `error()` shapes errors with `{ name, message, stack }` under an `err` field.
- `fail()` and `aggregate()` log then throw; `help()` just builds the error object.

## Testing tips

- Use a fake `LoggerPort` to capture entries.
- Seed `DiagnosticAdapter` with domain maps and asserts on `level`, `message`, and `fields`.
- Prefer testing `DiagnosticAdapter` behavior in isolation for mapping and in integration for orchestration events.
