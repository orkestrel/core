# Phase 2: Core API

> **Status:** ⏳ Pending
> **Started:** —
> **Target:** 2026-01-21
> **Depends on:** Phase 1 (Foundation) ⏳ Pending

## Objective

Implement the core adapter classes following the new conventions.  By end of phase, BaseAdapter, Emitter, Queue, Registry, Layer, Logger, and Diagnostic will be fully implemented with tests.

## Deliverables

| # | Deliverable | Status | Assignee |
|---|-------------|--------|----------|
| 2.1 | Implement `BaseAdapter` in `core/adapter/` | ⏳ Pending | — |
| 2.2 | Implement `Logger` in `core/logger/` | ⏳ Pending | — |
| 2.3 | Implement `NoopLogger` in `core/logger/` | ⏳ Pending | — |
| 2.4 | Implement `FakeLogger` for testing | ⏳ Pending | — |
| 2.5 | Implement `Diagnostic` in `core/diagnostic/` | ⏳ Pending | — |
| 2.6 | Implement `Emitter` in `core/emitter/` | ⏳ Pending | — |
| 2.7 | Implement `Queue` in `core/queue/` | ⏳ Pending | — |
| 2.8 | Implement `Registry` in `core/registry/` | ⏳ Pending | — |
| 2.9 | Implement `Layer` in `core/layer/` | ⏳ Pending | — |
| 2.10 | Unit tests for all above | ⏳ Pending | — |

**Status Legend:**
- ✅ Done
- 🔄 Active
- ⏳ Pending

## Current Focus: 2.1 BaseAdapter

### Requirements

1. Abstract base class for lifecycle-managed singleton components
2. State machine:  `created → started → stopped → destroyed`
3. Static singleton pattern per subclass
4. Protected hooks:  `onCreate`, `onStart`, `onStop`, `onDestroy`, `onTransition`
5. Implements `AdapterInterface` and `LifecycleSubscriptions`
6. Uses `#` private fields
7. Subscription methods return `Unsubscribe`

### Interface Contract

```typescript
// From src/types.ts
export interface AdapterInterface extends LifecycleSubscriptions {
	readonly state: LifecycleState
	readonly logger: LoggerInterface
	readonly diagnostic: DiagnosticInterface
	readonly emitter: EmitterInterface<LifecycleEventMap>
	readonly queue: QueueInterface
}

// AdapterConstructor for static methods
export interface AdapterConstructor<T extends AdapterInterface> {
	new (options?: AdapterOptions): T
	instance?:  T
	getInstance(options?: AdapterOptions): T
	getState(): LifecycleState
	create(options?: AdapterOptions): Promise<void>
	start(options?: AdapterOptions): Promise<void>
	stop(): Promise<void>
	destroy(): Promise<void>
}
```

### Implementation Checklist

- [ ] Create `src/core/adapter/BaseAdapter.ts`
- [ ] Implement state machine with `#state` private field
- [ ] Implement static `getInstance()` method
- [ ] Implement static `getState()` method
- [ ] Implement static `create()` method
- [ ] Implement static `start()` method
- [ ] Implement static `stop()` method
- [ ] Implement static `destroy()` method
- [ ] Implement `onTransition` subscription returning `Unsubscribe`
- [ ] Implement `onCreate` subscription returning `Unsubscribe`
- [ ] Implement `onStart` subscription returning `Unsubscribe`
- [ ] Implement `onStop` subscription returning `Unsubscribe`
- [ ] Implement `onDestroy` subscription returning `Unsubscribe`
- [ ] Implement `onError` subscription returning `Unsubscribe`
- [ ] Implement protected `onCreate()` hook
- [ ] Implement protected `onStart()` hook
- [ ] Implement protected `onStop()` hook
- [ ] Implement protected `onDestroy()` hook
- [ ] Implement protected `onTransition()` hook
- [ ] Add to barrel export

### Acceptance Criteria

```typescript
describe('BaseAdapter', () => {
	class TestAdapter extends BaseAdapter {
		public calls: string[] = []
		protected async onCreate(): Promise<void> { this.calls.push('create') }
		protected async onStart(): Promise<void> { this. calls.push('start') }
		protected async onStop(): Promise<void> { this.calls.push('stop') }
		protected async onDestroy(): Promise<void> { this.calls.push('destroy') }
	}

	afterEach(async () => {
		await TestAdapter.destroy().catch(() => {})
	})

	it('manages lifecycle through static methods', async () => {
		await TestAdapter.start()
		expect(TestAdapter.getState()).toBe('started')
		await TestAdapter.stop()
		expect(TestAdapter.getState()).toBe('stopped')
		await TestAdapter.destroy()
	})

	it('subscription methods return Unsubscribe', async () => {
		const instance = TestAdapter.getInstance()
		const states:  LifecycleState[] = []
		const cleanup = instance.onTransition((state) => states.push(state))
		expect(typeof cleanup).toBe('function')
		await TestAdapter.start()
		cleanup()
		await TestAdapter.stop()
		// Only captured 'started', not 'stopped' after cleanup
		expect(states).toContain('started')
	})
})
```

### Blocked By

- Phase 1 (types.ts refactoring)

### Blocks

- 2.5 (Diagnostic) — Uses BaseAdapter patterns
- 2.6 (Emitter) — Used by BaseAdapter
- All Phase 3 deliverables

## Notes

- The static singleton pattern is unique to this library
- Each subclass maintains its own instance via `this.instance`
- TypeScript doesn't allow `new this()` on abstract classes, so we use runtime binding
- All subscription methods must store listeners and return cleanup functions

## Phase Completion Criteria

All of the following must be true: 

- [ ] All deliverables marked ✅ Done
- [ ] `npm run check` passes
- [ ] `npm run test` passes with >80% coverage on new code
- [ ] No `it.todo()` remaining in phase scope
- [ ] PLAN.md updated to show Phase 2 complete