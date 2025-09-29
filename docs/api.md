# API

This is the comprehensive reference for `@orkestrel/core`. It documents every exported type, function, class, and helper with signatures and examples.

Exports are re-exported from [src/index.ts](../src/index.ts):
- errors
- lifecycle
- adapter
- container
- orchestrator
- ports
- emitter
- registry

---

## errors

Source: [src/errors.ts](../src/errors.ts)

### class LifecycleError extends Error
- constructor(message: string, cause?: unknown)
- Properties: `name = 'LifecycleError'`, `cause?: unknown`

### class InvalidTransitionError extends LifecycleError
- constructor(from: string, to: string)
- Message: `Invalid lifecycle transition from '<from>' to '<to>'`

### class TimeoutError extends LifecycleError
- constructor(hook: string, ms: number)
- Message: `Lifecycle hook '<hook>' timed out after <ms>ms`

### class AggregateLifecycleError extends LifecycleError
- constructor(message: string, details: LifecycleErrorDetail[])
- Properties:
  - `errors: Error[]` — the underlying errors
  - `details: LifecycleErrorDetail[]` — enriched telemetry per failure

### type LifecyclePhase
- `'start' | 'stop' | 'destroy'`

### type LifecycleContext
- `'normal' | 'rollback' | 'container'`

### interface LifecycleErrorDetail
- `tokenDescription: string`
- `tokenKey?: symbol`
- `phase: LifecyclePhase`
- `context: LifecycleContext`
- `timedOut: boolean`
- `durationMs: number`
- `error: Error`

---

## lifecycle

Source: [src/lifecycle.ts](../src/lifecycle.ts)

### type LifecycleState
- Union: `'created' | 'started' | 'stopped' | 'destroyed'`

### interface LifecycleOptions
- `hookTimeoutMs?: number` — default 5000
- `onTransitionFilter?: (from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy') => boolean` — defaults to always true; when false, `onTransition` is skipped for that transition

### class Lifecycle
- constructor(opts?: LifecycleOptions)
- readonly state: LifecycleState
- Events emitted: `stateChange(LifecycleState)`, `create()`, `start()`, `stop()`, `destroy()`, `error(LifecycleError)`
- Methods:
  - `on(evt, fn)` / `off(evt, fn)` — subscribe/unsubscribe to events
  - `create(): Promise<void>`
  - `start(): Promise<void>`
  - `stop(): Promise<void>`
  - `destroy(): Promise<void>`
- Protected hooks to override:
  - `onCreate()`, `onStart()`, `onStop()`, `onDestroy()`
  - `onTransition(from, to, hook)` — runs after the primary hook resolves and before the state changes; useful for debugging or cross-cutting transitions
- Throws:
  - `InvalidTransitionError` on illegal state transitions
  - `TimeoutError` if a hook exceeds configured timeout (applies to both the primary hook and `onTransition`)
  - Wraps hook errors in `LifecycleError`

Hook timing
- For each public method (`create`, `start`, `stop`, `destroy`):
  1. Validate transition (throws on invalid)
  2. Run corresponding `onX` hook with timeout
  3. If `onTransitionFilter(from, to, hook)` returns true, run `onTransition(from, to, hook)` with the same timeout
  4. Update `state` and emit `stateChange`
  5. Emit the hook event (`create`/`start`/`stop`/`destroy`)

Example:
```ts
class EmailService extends Lifecycle {
  protected async onStart() { /* open connection */ }
  protected async onStop() { /* flush/close */ }
  protected async onTransition(from: 'created'|'started'|'stopped'|'destroyed', to: typeof from, hook: 'create'|'start'|'stop'|'destroy') {
    console.debug(`[lc] ${from} -> ${to} via ${hook}`)
  }
}
```

---

## adapter

Source: [src/adapter.ts](../src/adapter.ts)

### abstract class Adapter extends Lifecycle
- Convenience base class for adapters that need lifecycle hooks.
- Override any of `onCreate/onStart/onStop/onDestroy` as needed.

---

## container

Source: [src/container.ts](../src/container.ts)

### type Token<T>
- `{ readonly key: symbol; readonly description: string }`

### function createToken<T = unknown>(description: string): Token<T>
- Creates a unique token with a human-readable description.

### type TokensOf<T>
- Mapped type for sets returned by `createTokens`/`createPortTokens`.

### function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): { [K in keyof T & string]: Token<T[K]> }
- Creates a set of tokens for the provided shape using a shared namespace.

### Provider types
- `ValueProvider<T> { useValue: T }`
- `FactoryProvider<T> { useFactory: (c: Container) => T }`
- `ClassProvider<T> { useClass: new (c: Container) => T }`
- `Provider<T> = ValueProvider<T> | FactoryProvider<T> | ClassProvider<T> | T`

### Type guards
- `isValueProvider<T>(p): p is ValueProvider<T>`
- `isFactoryProvider<T>(p): p is FactoryProvider<T>`
- `isClassProvider<T>(p): p is ClassProvider<T>`

### class Container
- constructor(opts?: { parent?: Container })
- Methods:
  - `register<T>(token: Token<T>, provider: Provider<T>): this`
  - `set<T>(token: Token<T>, value: T): void` (shorthand for `useValue`)
  - `has<T>(token: Token<T>): boolean`
  - `get<T>(token: Token<T>): T` (throws if not registered)
  - `tryGet<T>(token: Token<T>): T | undefined`
  - `createChild(): Container`
  - `destroy(): Promise<void>` — stops/destroys any Lifecycle values created by factory/class providers from this container; aggregates errors

Notes
- Values from `useFactory`/`useClass` are considered disposable by the container for `destroy()`; raw values and `useValue` are not.
- Resolution walks up to `parent` if not found locally.

### global helper: container
Source: [src/container.ts](../src/container.ts), [src/registry.ts](../src/registry.ts)

A getter/setter for globally accessible Container instances (optional; intended for app glue, not libraries).

Signature:
```ts
export type ContainerGetter = {
  (name?: string | symbol): Container
  set(c: Container, name?: string | symbol): void
  clear(name?: string | symbol): boolean
  list(): (string | symbol)[]
}
```

Usage:
```ts
import { container } from '@orkestrel/core'

const c = container()           // default instance (must be set first)
container.set(c)                // set default
container.set(new Container(), 'tenant:A') // named instance
```

---

## orchestrator

Source: [src/orchestrator.ts](../src/orchestrator.ts)

Note
- See [Start](./start.md) for a common boot pattern using `start([...])`. The methods below let you choose the right level of control for your app or tests.

### type OrchestratorRegistration<T>
- `{ token: Token<T>; provider: Provider<T>; dependencies?: Token<unknown>[]; timeouts?: { onStart?: number; onStop?: number; onDestroy?: number } }`

### class Orchestrator
- constructor(container?: Container) — if omitted, creates an internal container
- Methods:
  - `getContainer(): Container`
  - `register<T>(token: Token<T>, provider: Provider<T>, dependencies?: Token<unknown>[]): void`
  - `start(regs: OrchestratorRegistration<unknown>[]): Promise<void>` — registers then `startAll()`
  - `startAll(): Promise<void>` — starts Lifecycle components in topological order; parallelizes within dependency layers; rolls back (stops) prior successes if a layer fails
  - `stopAll(): Promise<void>` — stops in reverse topological layers; parallelizes; aggregates errors
  - `destroyAll(): Promise<void>` — destroys in reverse layers; then `container.destroy()`; aggregates errors

Throws
- `AggregateLifecycleError` from batch operations; inspect `.details` for per-component telemetry
- Error on unknown dependency or dependency cycles

Async provider guards
- The orchestrator forbids async providers to keep startup deterministic:
  - `useValue` must not be a Promise — registration throws with a helpful error.
  - `useFactory` must be synchronous and must not return a Promise — registration throws if the function is `async` or returns a Promise.
- Move async work to `Lifecycle.onStart()` or pre-resolve the value before registration.

Telemetry per failure (AggregateLifecycleError.details)
- `tokenDescription`, `tokenKey?`
- `phase: 'start'|'stop'|'destroy'`
- `context: 'normal'|'rollback'|'container'`
- `timedOut: boolean`
- `durationMs: number`
- `error: Error`

### global helper: orchestrator
Source: [src/orchestrator.ts](../src/orchestrator.ts), [src/registry.ts](../src/registry.ts)

A getter/setter for globally accessible Orchestrator instances (optional; intended for app glue).

Signature:
```ts
export type OrchestratorGetter = {
  (name?: string | symbol): Orchestrator
  set(o: Orchestrator, name?: string | symbol): void
  clear(name?: string | symbol): boolean
  list(): (string | symbol)[]
}
```

---

## ports

Source: [src/ports.ts](../src/ports.ts)

### function createPortTokens<T extends Record<string, unknown>>(shape: T, namespace = 'ports'): { [K in keyof T]: Token<T[K]> }
- Creates a token set for your port interfaces with a shared namespace.

### function extendPorts(...)
Overloads:
- `extendPorts<Ext>(ext: Ext): { [K in keyof Ext]: Token<Ext[K]> }`
- `extendPorts<Base, Ext>(base: Base, ext: Ext): Base & { [K in keyof Ext]: Token<Ext[K]> }`

Notes
- Throws on duplicate keys when extending a base set.

### function createPortToken<T>(name: string): Token<T>
- Convenience creator for a single port token.

---

## emitter

Source: [src/emitter.ts](../src/emitter.ts)

### class Emitter
A minimal event emitter used internally by `Lifecycle`.
- Methods:
  - `on(event: string, fn: (...args: unknown[]) => void): this`
  - `off(event: string, fn: (...args: unknown[]) => void): this`
  - `emit(event: string, ...args: unknown[]): void`
  - `removeAllListeners(): void`

Note: This emitter is very small and untyped (uses `unknown[]`); it’s adequate for internal events.

---

## registry

Source: [src/registry.ts](../src/registry.ts)

### class Registry<T>
Helper used by the global instance helpers.
- constructor(label: string, defaultKey: symbol)
- Methods:
  - `get(name?: string | symbol): T` — throws if missing
  - `tryGet(name?: string | symbol): T | undefined`
  - `set(nameOrKey: string | symbol, value: T): void`
  - `setDefault(value: T): void`
  - `clear(name?: string | symbol): boolean`
  - `list(): (string | symbol)[]`

---

## Examples

See `docs/examples.md` for runnable examples and patterns, and `docs/patterns.md` for composition guidance.
