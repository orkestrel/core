# Phase 1: Foundation

> **Status:** 🔄 In Progress
> **Started:** 2026-01-14
> **Target:** 2026-01-17
> **Depends on:** None (initial phase)

## Objective

Establish the foundational types, utilities, and structure for the refactored @orkestrel/core.  By end of phase, all types will be defined in types.ts following conventions, all type guards implemented natively, and file structure reorganized.

## Deliverables

| # | Deliverable | Status | Assignee |
|---|-------------|--------|----------|
| 1.1 | Refactor `types.ts` with Interface suffix convention | ✅ Done | — |
| 1.2 | Implement native type guards in `helpers.ts` | ✅ Done | — |
| 1.3 | Update `constants.ts` with standardized error messages | ✅ Done | — |
| 1.4 | Create `errors.ts` with error class hierarchy | ✅ Done | — |
| 1.5 | Create `factories.ts` stub | ✅ Done | — |
| 1.6 | Create `core/` directory structure | ⏳ Pending | — |
| 1.7 | Unit tests for helpers and types | ⏳ Pending | — |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending

## Completed Work

### 1.1 Refactor types.ts ✅

- Added `Unsubscribe` type at top of file
- Added `SubscriptionToHook` utility type
- Renamed `LoggerPort` → `LoggerInterface`
- Renamed `DiagnosticPort` → `DiagnosticInterface`
- Renamed `EmitterPort` → `EmitterInterface`
- Renamed `EventPort` → `EventBusInterface`
- Renamed `QueuePort` → `QueueInterface`
- Renamed `LayerPort` → `LayerInterface`
- Renamed `RegistryPort` → `RegistryInterface`
- Added `LifecycleSubscriptions` interface
- Updated event listener return type to `unknown`
- Updated `EventMap` to use `readonly unknown[]`
- Added deprecated type aliases for backward compatibility

### 1.2 Native Type Guards ✅

Implemented in `helpers.ts`:
- `isString`, `isNumber`, `isBoolean`, `isFunction`
- `isRecord`, `isError`, `isArray`
- `isLiteral`, `isArrayOf`
- Updated `isLifecycleErrorDetail` and `isAggregateLifecycleError`

### 1.4 Error Classes ✅

Created `errors.ts` with:
- `OrkestrelError` - Base error class
- `NotFoundError` - For resolve() failures
- `InvalidTransitionError` - For invalid lifecycle transitions
- `TimeoutError` - For hook timeouts
- `AggregateLifecycleError` - For multiple failures
- `ContainerDestroyedError` - For destroyed container access
- `CircularDependencyError` - For dependency cycles
- `DuplicateRegistrationError` - For duplicate registrations

### 1.5 Factories Stub ✅

Created `factories.ts` with `createToken` function.
Additional factory functions to be added in Phase 3.

## Current Focus:  1.6 Create core/ directory structure
export type LifecycleState = 'created' | 'started' | 'stopped' | 'destroyed'
export type LifecyclePhase = 'start' | 'stop' | 'destroy'
export type LifecycleHook = 'create' | 'start' | 'stop' | 'destroy'

// Event types
export type EventMap = Record<string, readonly unknown[]>
export type EventListener<EMap extends EventMap, E extends keyof EMap & string> =
	(... args: EMap[E]) => unknown

// Subscription interfaces (no suffix)
export interface LifecycleSubscriptions {
	onTransition(callback: (state: LifecycleState) => unknown): Unsubscribe
	onCreate(callback: () => unknown): Unsubscribe
	onStart(callback: () => unknown): Unsubscribe
	onStop(callback: () => unknown): Unsubscribe
	onDestroy(callback:  () => unknown): Unsubscribe
	onError(callback: (error:  Error) => unknown): Unsubscribe
}

// Behavioral interfaces (with Interface suffix)
export interface LoggerInterface {
	debug(message: string, ... args: readonly unknown[]): void
	info(message: string, ...args: readonly unknown[]): void
	warn(message: string, ...args: readonly unknown[]): void
	error(message: string, ...args: readonly unknown[]): void
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void
}

export interface DiagnosticInterface {
	log(level: LogLevel, message:  string, fields?: Record<string, unknown>): void
	error(err: unknown, context?: DiagnosticErrorContext): void
	fail(key: string, context?: DiagnosticFailContext): never
	aggregate(key: string, details: readonly (LifecycleErrorDetail | Error)[], context?: DiagnosticFailContext): never
	help(key: string, context?: DiagnosticFailContext): Error
	metric(name: string, value: number, tags?: Record<string, string | number | boolean>): void
	trace(name: string, payload?: Record<string, unknown>): void
	event(name: string, payload?: Record<string, unknown>): void
}

export interface EmitterInterface<EMap extends EventMap = EventMap> {
	on<E extends keyof EMap & string>(event: E, fn: EventListener<EMap, E>): Unsubscribe
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void
	removeAllListeners(): void
}

export interface QueueInterface<T = unknown> {
	enqueue(item: T): Promise<void>
	dequeue(): Promise<T | undefined>
	size(): Promise<number>
	run<R>(tasks: readonly (() => Promise<R> | R)[], options?: QueueRunOptions): Promise<readonly R[]>
}

export interface LayerInterface {
	compute<T>(nodes: readonly LayerNode<T>[]): readonly (readonly Token<T>[])[]
	group<T>(tokens: readonly Token<T>[], layers: readonly (readonly Token<T>[])[]): readonly (readonly Token<T>[])[]
}

export interface RegistryInterface<T> {
	get(name?:  string | symbol): T | undefined
	resolve(name?:  string | symbol): T
	set(name: string | symbol, value: T, lock?: boolean): void
	clear(name?: string | symbol, force?: boolean): boolean
	list(): readonly (string | symbol)[]
}

export interface AdapterInterface extends LifecycleSubscriptions {
	readonly state: LifecycleState
	readonly logger: LoggerInterface
	readonly diagnostic: DiagnosticInterface
	readonly emitter: EmitterInterface<LifecycleEventMap>
	readonly queue: QueueInterface
}

export interface ContainerInterface {
	readonly diagnostic: DiagnosticInterface
	readonly logger: LoggerInterface
	register<T extends AdapterInterface>(token: Token<T>, provider: AdapterProvider<T>, lock?: boolean): this
	has<T extends AdapterInterface>(token:  Token<T>): boolean
	get<T extends AdapterInterface>(token: Token<T>): T | undefined
	resolve<T extends AdapterInterface>(token: Token<T>): T
	createChild(): ContainerInterface
	using<T>(fn: (scope: ContainerInterface) => T | Promise<T>): Promise<T>
	destroy(): Promise<void>
}

export interface OrchestratorInterface {
	start(graph: OrchestratorGraph): Promise<void>
	stop(): Promise<void>
	destroy(): Promise<void>
}
```

### Implementation Checklist

- [ ] Create backup of current `types.ts`
- [ ] Add `Unsubscribe` type at top of file
- [ ] Add `SubscriptionToHook` utility type
- [ ] Rename `LoggerPort` → `LoggerInterface`
- [ ] Rename `DiagnosticPort` → `DiagnosticInterface`
- [ ] Rename `EmitterPort` → `EmitterInterface`
- [ ] Rename `EventPort` → `EventBusInterface`
- [ ] Rename `QueuePort` → `QueueInterface`
- [ ] Rename `LayerPort` → `LayerInterface`
- [ ] Rename `RegistryPort` → `RegistryInterface`
- [ ] Add `AdapterInterface` (new, for public contract)
- [ ] Add `ContainerInterface` (new, for public contract)
- [ ] Add `OrchestratorInterface` (new, for public contract)
- [ ] Add `LifecycleSubscriptions` interface
- [ ] Update event listener to return `unknown`
- [ ] Update `EventMap` to use `readonly unknown[]`
- [ ] Remove circular imports to `./adapters/*.js`
- [ ] Update barrel exports in `index.ts`

### Acceptance Criteria

```typescript
// This test must pass before marking 1.1 complete
describe('types.ts', () => {
	it('exports Unsubscribe type', () => {
		type Test = Unsubscribe
		const cleanup:  Test = () => {}
		expect(typeof cleanup).toBe('function')
	})

	it('exports interfaces with Interface suffix', () => {
		// Type-only test - compilation proves correctness
		type _Logger = LoggerInterface
		type _Diagnostic = DiagnosticInterface
		type _Emitter = EmitterInterface
		type _Queue = QueueInterface
		type _Layer = LayerInterface
		type _Registry = RegistryInterface<unknown>
		type _Adapter = AdapterInterface
		type _Container = ContainerInterface
		type _Orchestrator = OrchestratorInterface
		expect(true).toBe(true)
	})

	it('LifecycleSubscriptions methods return Unsubscribe', () => {
		// Type-only test
		const subs: LifecycleSubscriptions = {
			onTransition: () => () => {},
			onCreate: () => () => {},
			onStart: () => () => {},
			onStop: () => () => {},
			onDestroy: () => () => {},
			onError: () => () => {},
		}
		const cleanup = subs.onStart(() => {})
		expect(typeof cleanup).toBe('function')
	})
})
```

### Blocked By

Nothing currently. 

### Blocks

- 1.2 (helpers.ts) — Needs type imports from types.ts
- 1.4 (errors.ts) — Needs error types from types.ts
- All Phase 2 deliverables — Need finalized types

## Notes

- Keep all existing types that are still needed for backward compatibility
- Types that are purely internal can be marked with `/** @internal */` JSDoc
- The `AdapterSubclass` type needs to reference the new `AdapterInterface`
- Remember:  Use `#` private fields, not `private` keyword

## Phase Completion Criteria

All of the following must be true:

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run test` passes with >80% coverage on new code
- [ ] No `it. todo()` remaining in phase scope
- [ ] PLAN.md updated to show Phase 1 complete