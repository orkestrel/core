# API

This is the comprehensive reference for `@orkestrel/core`. It documents every exported type, function, class, and helper with signatures and examples.

Note: This document is kept in sync with TSDoc comments in the source files (see `src/*.ts`). Messages and error codes are stable and referenced throughout.

Exports are re-exported from [src/index.ts](../src/index.ts):
- lifecycle
- adapter
- container
- orchestrator
- ports

---

## diagnostics (messages, codes, error classes)

Source: [src/diagnostics.ts](../src/diagnostics.ts)

### Codes
- ORK1001–ORK1006 Registry/Container errors
- ORK1007–ORK1017 Orchestrator/Container aggregate and guard errors
- ORK1020 Lifecycle invalid transition
- ORK1021 Lifecycle hook timeout
- ORK1099 Internal invariant

Messages
- All messages are formatted as `[Orkestrel][ORK####] ...` and include an optional `helpUrl`.

Guards
- `isLifecycleErrorDetail(x: unknown): x is LifecycleErrorDetail` — a tiny runtime guard to validate aggregated lifecycle error telemetry entries without external dependencies.

Utilities
- `tokenDescription(token: symbol): string` — returns a human-friendly token description (uses `token.description` when available, falls back to `String(token)`).

### class LifecycleError extends Error
- constructor(message: string, cause?: unknown, code?: string, helpUrl?: string)
- Properties: `name = 'LifecycleError'`, `cause?`, `code?`, `helpUrl?`

### class InvalidTransitionError extends LifecycleError
- constructor(from: string, to: string)
- Message uses ORK1020

### class TimeoutError extends LifecycleError
- constructor(hook: string, ms: number)
- Message uses ORK1021

### class AggregateLifecycleError extends LifecycleError
- constructor(info: { message: string, code?: string, helpUrl?: string }, details: LifecycleErrorDetail[] | Error[])
- Properties: `errors: Error[]`, `details: LifecycleErrorDetail[]`

### type LifecyclePhase
- `'start' | 'stop' | 'destroy'`

### type LifecycleContext
- `'normal' | 'rollback' | 'container'`

### interface LifecycleErrorDetail
A uniform, concise shape used for aggregated lifecycle errors. Each item helps you locate the failing component and understand what happened.
- `tokenDescription: string` — human-friendly token description
- `phase: LifecyclePhase` — which lifecycle phase ran
- `context: LifecycleContext` — normal flow, rollback, or container cleanup
- `timedOut: boolean` — whether a timeout occurred during the hook
- `durationMs: number` — how long the hook ran
- `error: Error` — the original error that was thrown

---

## lifecycle

Source: [src/lifecycle.ts](../src/lifecycle.ts)

### type LifecycleState
- Union: `'created' | 'started' | 'stopped' | 'destroyed'`

### interface LifecycleOptions
- `hookTimeoutMs?: number` — default 5000
- `onTransitionFilter?: (from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy') => boolean`
- `emitInitialState?: boolean` — default true; when false, suppresses the initial deferred `stateChange('created')` emission

### class Lifecycle
- constructor(opts?: LifecycleOptions)
- readonly state: LifecycleState
- Events emitted: `stateChange(LifecycleState)`, `create()`, `start()`, `stop()`, `destroy()`, `error(LifecycleError)`
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

Event hygiene
- `stateChange` is not emitted when the state doesn’t actually change (e.g., `create()` from `created` won’t emit a duplicate `created`).

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

Error classes and utilities (used by Lifecycle and Orchestrator)
- `class LifecycleError extends Error`
- `class InvalidTransitionError extends LifecycleError`
- `class TimeoutError extends LifecycleError`
- `class AggregateLifecycleError extends LifecycleError`
- `type LifecyclePhase = 'start' | 'stop' | 'destroy'`
- `type LifecycleContext = 'normal' | 'rollback' | 'container'`
- `interface LifecycleErrorDetail { tokenDescription: string; phase: LifecyclePhase; context: LifecycleContext; timedOut: boolean; durationMs: number; error: Error }`
- `function tokenDescription(token: symbol): string`

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
- `symbol` (with an optional description when created via `Symbol(description)`)

### function createToken<T = unknown>(description: string): Token<T>
- Creates a unique symbol token with the given human-readable description.

### type TokensOf<T>
- Mapped type for sets returned by `createTokens`/`createPortTokens`.

### function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): { [K in keyof T & string]: Token<T[K]> }
- Creates a set of tokens for the provided shape using a shared namespace.

### Provider types
- `ValueProvider<T> { useValue: T }`
- Factory providers (strictly synchronous):
  - Tuple injection: `{ useFactory: (...args: A) => T, inject: InjectTuple<A> }`
  - Object injection: `{ useFactory: (deps: O) => T, inject: InjectObject<O> }`
  - No deps: `{ useFactory: () => T }` or `{ useFactory: (container: Container) => T }`
- Class providers (strictly synchronous):
  - Tuple injection: `{ useClass: new (...args: A) => T, inject: InjectTuple<A> }`
  - No deps: `{ useClass: new () => T }` or `{ useClass: new (container: Container) => T }`
- Bare value: `T` — equivalent to `useValue` (container treats it as externally owned)

### Inject helpers
- `type InjectTuple<A extends readonly unknown[]> = { [K in keyof A]: Token<A[K]> }`
- `type InjectObject<O extends Record<string, unknown>> = { [K in keyof O]: Token<O[K]> }`

These types ensure that your `inject` shape matches the parameter types of your factory or class constructor at compile time.

### register forms
`register` supports three concise forms:
1) Tuple/Object inject forms (inference-friendly)
- `register(token, { useFactory, inject: [...] })`
- `register(token, { useFactory, inject: { ... } })`
- `register(token, { useClass, inject: [...] })`

2) No-deps forms
- `register(token, { useFactory: () => T })`
- `register(token, { useFactory: (c: Container) => T })`
- `register(token, { useClass: Ctor })` where `Ctor` is `new () => T` or `new (c: Container) => T`
  - The container inspects constructor arity at runtime: if the constructor expects one parameter, it passes the container; otherwise, it calls the zero-arg constructor.

3) Value forms
- `register(token, { useValue: value })`
- `register(token, value)`

### Type guards
- `isValueProvider<T>(p): p is ValueProvider<T>`
- `isFactoryProvider<T>(p): p is FactoryProvider<T>`
- `isClassProvider<T>(p): p is ClassProvider<T>`

### class Container
- constructor(opts?: { parent?: Container })
- Methods:
  - `register<T>(token: Token<T>, provider: Provider<T>, lock?: boolean): this` — lock prevents re-registration for the same token.
  - `set<T>(token: Token<T>, value: T, lock?: boolean): void` — lock prevents overwriting the value provider.
  - `has<T>(token: Token<T>): boolean`
  - `resolve<T>(token: Token<T>): T`
  - `resolve<TMap extends Record<string, Token<unknown>>>(tokens: TMap): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }`
  - `get<T>(token: Token<T>): T | undefined`
  - `get<TMap extends Record<string, Token<unknown>>>(tokens: TMap): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }`
  - `createChild(): Container`
  - `using<T>(fn: (scope: Container) => Promise<T> | T): Promise<T>`
  - `using<T>(apply: (scope: Container) => void, fn: (scope: Container) => Promise<T> | T): Promise<T>` — create a child scope, apply overrides in `apply(scope)`, run `fn(scope)`, and always destroy the scope.
  - `destroy(): Promise<void>`

Lifecycle ownership semantics
- Instances created via factory/class providers are considered container-created and will be destroyed by `container.destroy()` if they extend `Lifecycle`.
- Instances supplied via value/bare value are treated as externally owned and are not destroyed by `container.destroy()`.

### global helper: container
Source: [src/container.ts](../src/container.ts)

A getter/setter for globally accessible Container instances (a default is created at module load).

Signature:
```ts
export type ContainerGetter = {
  (name?: string | symbol): Container
  set(name: string | symbol, c: Container, lock?: boolean): void
  clear(name?: string | symbol, force?: boolean): boolean
  list(): (string | symbol)[]

  resolve<T>(token: Token<T>, name?: string | symbol): T
  resolve<TMap extends Record<string, Token<unknown>>>(tokens: TMap, name?: string | symbol): { /* mapped values */ }

  get<T>(token: Token<T>, name?: string | symbol): T | undefined
  get<TMap extends Record<string, Token<unknown>>>(tokens: TMap, name?: string | symbol): { /* mapped values (optional) */ }

  using<T>(fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T>
}
```

Notes
- The default entry is protected and cannot be replaced or cleared.
- Named entries can be locked by passing `lock=true` when calling `set`.

---

## orchestrator

Source: [src/orchestrator.ts](../src/orchestrator.ts)

### type OrchestratorRegistration<T>
- `{ token: Token<T>; provider: Provider<T>; dependencies?: Token<unknown>[]; timeouts?: { onStart?: number; onStop?: number; onDestroy?: number } }`

### interface OrchestratorOptions
- `defaultTimeouts?: { onStart?: number; onStop?: number; onDestroy?: number }`
- `events?: { onComponentStart?, onComponentStop?, onComponentDestroy?, onComponentError? }`
- `tracer?: { onLayers?: (payload: { layers: string[][] }) => void; onPhase?: (payload: { phase: 'start'|'stop'|'destroy', layer: number, outcomes: { token: string, ok: boolean, durationMs: number, timedOut?: boolean }[] }) => void }`
- `concurrency?: number` — optional per-layer concurrency cap; when set, start/stop/destroy in each layer run at most this many tasks in parallel. Default: unlimited.

### class Orchestrator
- constructor(container?: Container)
- constructor(options?: OrchestratorOptions)
- constructor(container: Container, options?: OrchestratorOptions)
- Methods:
  - `getContainer(): Container`
  - `register<T>(...): OrchestratorRegistration<T>` — registers a component with optional dependencies and timeouts
  - `start(regs: OrchestratorRegistration<unknown>[]): Promise<void>` — registers any provided components and starts lifecycles in dependency order; aggregates errors with code ORK1013
  - `stop(): Promise<void>` — stops all started components in reverse dependency order; aggregates errors with code ORK1014
  - `destroy(): Promise<void>` — stops any started components as needed, then destroys all lifecycles in reverse dependency order; aggregates errors with code ORK1017; finally destroys the container

### helper: register
Overloads (preserve inject typing):
- Tuple inject (useClass or useFactory)
  - `register<T, A extends readonly unknown[]>(token: Token<T>, provider: { useClass: new (...args: A) => T, inject: InjectTuple[A] } | { useFactory: (...args: A) => T, inject: InjectTuple[A] }, options?: { dependencies?, timeouts? }): OrchestratorRegistration<T>`
- Object inject (useFactory)
  - `register<T, O extends Record<string, unknown>>(token: Token<T>, provider: { useFactory: (deps: O) => T, inject: InjectObject<O> }, options?: { dependencies?, timeouts? }): OrchestratorRegistration<T>`
- No-deps/value forms
  - `register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, options?: { dependencies?, timeouts? }): OrchestratorRegistration<T>`

Examples
- Tuple inject with a class:
  ```ts
  class Service { constructor(private readonly log: Logger, private readonly cfg: Cfg) {} }
  register(TService, { useClass: Service, inject: [TLogger, TCfg] }, { dependencies: [TLogger, TCfg] })
  ```
- Object inject with a factory:
  ```ts
  register(TService, { useFactory: ({ log, cfg }: { log: Logger, cfg: Cfg }) => new Service(log, cfg), inject: { log: TLogger, cfg: TCfg } }, { dependencies: [TLogger, TCfg] })
  ```

### Inject vs Dependencies
- `inject` is part of the provider and tells the Container how to supply constructor/factory arguments by resolving tokens.
- `dependencies` is part of the orchestrator registration and tells the Orchestrator which tokens must be started before this one. It influences lifecycle ordering and rollback, not function parameters.
- These are complementary; you will often use both. The orchestrator doesn’t infer `dependencies` from `inject`.

### global helper: orchestrator
Source: [src/orchestrator.ts](../src/orchestrator.ts)

A getter/setter for globally accessible Orchestrator instances (a default is created at module load).

Signature:
```ts
export type OrchestratorGetter = {
  (name?: string | symbol): Orchestrator
  set(name: string | symbol, o: Orchestrator, lock?: boolean): void
  clear(name?: string | symbol, force?: boolean): boolean
  list(): (string | symbol)[]
}
```

Notes
- The default entry is protected and cannot be replaced or cleared.
- Named entries can be locked by passing `lock=true` when calling `set`.

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
