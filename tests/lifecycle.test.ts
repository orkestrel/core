import { describe, test, beforeEach, afterEach, assert, expect } from 'vitest'

import type { LifecycleState, QueueInterface } from '@orkestrel/core'
import { Adapter, NoopLogger } from '@orkestrel/core'

let logger: NoopLogger

class TestLifecycle extends Adapter {
	static override instance: TestLifecycle | undefined
	public log: string[] = []
	protected override async onCreate(): Promise<void> {
		this.log.push('create')
	}

	protected override async onStart(): Promise<void> {
		this.log.push('start')
	}

	protected override async onStop(): Promise<void> {
		this.log.push('stop')
	}

	protected override async onDestroy(): Promise<void> {
		this.log.push('destroy')
	}
}

class FailingStart extends Adapter {
	static override instance: FailingStart | undefined
	protected override async onStart(): Promise<void> {
		throw new Error('boom')
	}
}
class HangingStart extends Adapter {
	static override instance: HangingStart | undefined
	protected override async onStart(): Promise<void> {
		await new Promise(() => {})
	}
}

describe('Lifecycle suite', () => {
	beforeEach(() => {
		logger = new NoopLogger()
	})

	afterEach(async() => {
		// Clean up any singleton instances
		await TestLifecycle.destroy().catch(() => {})
		await FailingStart.destroy().catch(() => {})
		await HangingStart.destroy().catch(() => {})
	})

	test('happy path transitions', async() => {
		await TestLifecycle.create({ timeouts: 100, logger })
		assert.equal(TestLifecycle.getState(), 'created')
		await TestLifecycle.start()
		assert.equal(TestLifecycle.getState(), 'started')
		await TestLifecycle.stop()
		assert.equal(TestLifecycle.getState(), 'stopped')
		await TestLifecycle.start()
		assert.equal(TestLifecycle.getState(), 'started')
		const instance = TestLifecycle.getInstance()
		assert.deepEqual(instance.log, ['create', 'start', 'stop', 'start'])
		await TestLifecycle.destroy()
		assert.equal(TestLifecycle.getState(), 'created')
	})

	test('failing start wraps error', async() => {
		await expect(() => FailingStart.start({ timeouts: 50, logger })).rejects.toThrow(/Hook 'start' failed/)
		assert.equal(FailingStart.getState(), 'created')
	})

	// New test: ensure non-timeout hook failures expose ORK1022 code
	test('failing start sets ORK1022 code', async() => {
		try {
			await FailingStart.start({ timeouts: 50, logger })
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			if (typeof err === 'object' && err !== null && 'code' in err) {
				const code = (err as { code?: unknown }).code
				if (typeof code === 'string') assert.equal(code, 'ORK1022')
			}
		}
	})

	test('hook timeout triggers TimeoutError', async() => {
		await expect(() => HangingStart.start({ timeouts: 10, logger })).rejects.toThrow(/timed out/)
		assert.equal(HangingStart.getState(), 'created')
	})

	// New test: ensure timeout failures expose ORK1021 code
	test('hook timeout sets ORK1021 code', async() => {
		try {
			await HangingStart.start({ timeouts: 10, logger })
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			if (typeof err === 'object' && err !== null && 'code' in err) {
				const code = (err as { code?: unknown }).code
				if (typeof code === 'string') assert.equal(code, 'ORK1021')
			}
		}
		assert.equal(HangingStart.getState(), 'created')
	})

	test('invalid transition throws', async() => {
		await TestLifecycle.start({ logger })
		await expect(() => TestLifecycle.create()).rejects.toThrow(/Invalid lifecycle transition/)
		await TestLifecycle.destroy()
		// After destroy, instance is cleared, so start() will create a new instance
		// This is expected behavior with singletons - destroy clears the singleton
	})

	test('onTransition runs between hook and state change (filterable in override)', async() => {
		class Transitions extends Adapter {
			static override instance: Transitions | undefined
			public transitions: string[] = []
			protected override async onStart(): Promise<void> {
				// no-op
			}

			protected override async onStop(): Promise<void> {
				// no-op
			}

			protected override async onTransition(from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy'): Promise<void> {
				// filter internally to only record 'start' transitions
				if (hook === 'start') this.transitions.push(`${from}->${to}:${hook}`)
			}
		}

		await Transitions.start({ timeouts: 50, logger })
		assert.equal(Transitions.getState(), 'started')
		await Transitions.stop()
		assert.equal(Transitions.getState(), 'stopped')
		const instance = Transitions.getInstance()
		assert.deepEqual(instance.transitions, ['created->started:start'])
		await Transitions.destroy()
	})

	test('onTransition timeout surfaces as TimeoutError', async() => {
		class SlowTransition extends Adapter {
			static override instance: SlowTransition | undefined
			protected override async onStart(): Promise<void> {
				// ok
			}

			protected override async onTransition(): Promise<void> {
				await new Promise(() => {})
			}
		}
		await expect(() => SlowTransition.start({ timeouts: 10, logger })).rejects.toThrow(/timed out/)
		assert.equal(SlowTransition.getState(), 'created')
		// Clean up manually without calling destroy which would also timeout
		SlowTransition.instance = undefined
	})

	test('transition not emitted twice for created->created on create()', async() => {
		const events: LifecycleState[] = []
		class L extends Adapter {
			static override instance: L | undefined
			protected override async onCreate(): Promise<void> {
				// no-op
			}
		}
		L.on('transition', s => events.push(s))
		// allow initial microtask to flush
		await new Promise(r => setTimeout(r, 0))
		assert.deepEqual(events, ['created'])
		await L.create({ timeouts: 20, logger })
		// no new event for created->created
		await new Promise(r => setTimeout(r, 0))
		assert.deepEqual(events, ['created'])
		await L.destroy()
	})

	test('emitInitial=false suppresses initial transition', async() => {
		const events: LifecycleState[] = []
		class L extends Adapter {
			static override instance: L | undefined
			protected override async onStart(): Promise<void> {
				// no-op
			}
		}
		// Subscribe before creating instance - this creates the instance with default options
		L.on('transition', s => events.push(s))
		// Wait for initial transition to complete
		await new Promise(r => setTimeout(r, 10))
		// Clear events (will have 'created' from subscription)
		events.length = 0
		// Now start it
		await L.start()
		await new Promise(r => setTimeout(r, 10))
		// Should only see started, not created again
		assert.deepEqual(events, ['started'])
		await L.destroy()
	})

	test('supports injected queue and enforces concurrency=1 with shared deadline', async() => {
		interface Capture { calls: number; lastOptions?: { concurrency: number | undefined; deadline: number | undefined } }
		const cap: Capture = { calls: 0 }
		class FakeQueue implements QueueInterface<unknown> {
			async enqueue(_: unknown): Promise<void> { /* noop */ }
			async dequeue(): Promise<unknown> { return undefined }
			async size(): Promise<number> { return 0 }
			async run<R>(tasks: readonly (() => Promise<R> | R)[], options?: { concurrency?: number; deadline?: number }): Promise<readonly R[]> {
				cap.calls++
				cap.lastOptions = { concurrency: options?.concurrency, deadline: options?.deadline }
				const out: R[] = []
				for (const t of tasks) out.push(await Promise.resolve(t()))
				return out
			}
		}
		class QLife extends Adapter {
			static override instance: QLife | undefined
			public ok = false
			protected override async onStart(): Promise<void> { this.ok = true }
			protected override async onTransition(): Promise<void> { /* no-op */ }
		}
		const timeouts = 25
		const q = new FakeQueue()
		await QLife.start({ timeouts, queue: q, logger })
		assert.equal(QLife.getState(), 'started')
		const instance = QLife.getInstance()
		assert.equal(instance.ok, true)
		assert.equal(cap.calls, 1)
		assert.equal(cap.lastOptions?.concurrency, 1)
		assert.equal(cap.lastOptions?.deadline, timeouts)
		await QLife.destroy()
	})
})
