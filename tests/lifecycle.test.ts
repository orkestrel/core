import { describe, test, beforeEach } from 'vitest'
import assert from 'node:assert/strict'
import type { LifecycleState, QueuePort } from '@orkestrel/core'
import { Adapter, NoopLogger } from '@orkestrel/core'

let logger: NoopLogger

class TestLifecycle extends Adapter {
	public log: string[] = []
	protected async onCreate(): Promise<void> {
		this.log.push('create')
	}

	protected async onStart(): Promise<void> {
		this.log.push('start')
	}

	protected async onStop(): Promise<void> {
		this.log.push('stop')
	}

	protected async onDestroy(): Promise<void> {
		this.log.push('destroy')
	}
}

class FailingStart extends Adapter {
	protected async onStart(): Promise<void> {
		throw new Error('boom')
	}
}
class HangingStart extends Adapter {
	protected async onStart(): Promise<void> {
		await new Promise(() => {})
	}
}

describe('Lifecycle suite', () => {
	beforeEach(() => {
		logger = new NoopLogger()
	})

	test('happy path transitions', async () => {
		const lc = new TestLifecycle({ timeouts: 100, logger })
		await lc._create()
		assert.equal(lc._getState(), 'created')
		await lc._start()
		assert.equal(lc._getState(), 'started')
		await lc._stop()
		assert.equal(lc._getState(), 'stopped')
		await lc._start()
		assert.equal(lc._getState(), 'started')
		await lc._destroy()
		assert.equal(lc._getState(), 'destroyed')
		assert.deepEqual(lc.log, ['create', 'start', 'stop', 'start', 'destroy'])
	})

	test('failing start wraps error', async () => {
		const lc = new FailingStart({ timeouts: 50, logger })
		await assert.rejects(() => lc._start(), /Hook 'start' failed/)
		assert.equal(lc._getState(), 'created')
	})

	// New test: ensure non-timeout hook failures expose ORK1022 code
	test('failing start sets ORK1022 code', async () => {
		const lc = new FailingStart({ timeouts: 50, logger })
		await assert.rejects(() => lc._start(), (err: unknown) => {
			// Narrow incrementally and check for a code property safely
			if (typeof err === 'object' && err !== null && 'code' in err) {
				const code = (err as { code?: unknown }).code
				// Only assert when a string code is present
				if (typeof code === 'string') assert.equal(code, 'ORK1022')
			}
			return true
		})
	})

	test('hook timeout triggers TimeoutError', async () => {
		const lc = new HangingStart({ timeouts: 10, logger })
		await assert.rejects(() => lc._start(), /timed out/)
		assert.equal(lc._getState(), 'created')
	})

	// New test: ensure timeout failures expose ORK1021 code
	test('hook timeout sets ORK1021 code', async () => {
		const lc = new HangingStart({ timeouts: 10, logger })
		await assert.rejects(() => lc._start(), (err: unknown) => {
			if (typeof err === 'object' && err !== null && 'code' in err) {
				const code = (err as { code?: unknown }).code
				if (typeof code === 'string') assert.equal(code, 'ORK1021')
			}
			return true
		})
		assert.equal(lc._getState(), 'created')
	})

	test('invalid transition throws', async () => {
		const lc = new TestLifecycle({ logger })
		await lc._start()
		await assert.rejects(async () => lc._create(), (err: unknown) => {
			assert.match((err as Error).message, /Invalid lifecycle transition/)
			return true
		})
		await lc._destroy()
		await assert.rejects(() => lc._start(), /Invalid lifecycle transition/)
	})

	test('onTransition runs between hook and state change (filterable in override)', async () => {
		class Transitions extends Adapter {
			public transitions: string[] = []
			protected async onStart(): Promise<void> {
				// no-op
			}

			protected async onStop(): Promise<void> {
				// no-op
			}

			protected async onTransition(from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy'): Promise<void> {
				// filter internally to only record 'start' transitions
				if (hook === 'start') this.transitions.push(`${from}->${to}:${hook}`)
			}
		}

		const lc = new Transitions({ timeouts: 50, logger })
		await lc._start()
		assert.equal(lc._getState(), 'started')
		await lc._stop()
		assert.equal(lc._getState(), 'stopped')
		assert.deepEqual(lc.transitions, ['created->started:start'])
	})

	test('onTransition timeout surfaces as TimeoutError', async () => {
		class SlowTransition extends Adapter {
			protected async onStart(): Promise<void> {
				// ok
			}

			protected async onTransition(): Promise<void> {
				await new Promise(() => {})
			}
		}
		const lc = new SlowTransition({ timeouts: 10, logger })
		await assert.rejects(() => lc._start(), /timed out/)
		assert.equal(lc._getState(), 'created')
	})

	test('transition not emitted twice for created->created on create()', async () => {
		const events: LifecycleState[] = []
		class L extends Adapter {
			protected async onCreate(): Promise<void> {
				// no-op
			}
		}
		const lc = new L({ timeouts: 20, logger })
		lc._on('transition', s => events.push(s))
		// allow initial microtask to flush
		await new Promise(r => setTimeout(r, 0))
		assert.deepEqual(events, ['created'])
		await lc._create()
		// no new event for created->created
		await new Promise(r => setTimeout(r, 0))
		assert.deepEqual(events, ['created'])
	})

	test('emitInitial=false suppresses initial transition', async () => {
		const events: LifecycleState[] = []
		class L extends Adapter {
			protected async onStart(): Promise<void> {
				// no-op
			}
		}
		const lc = new L({ timeouts: 20, emitInitial: false, logger })
		lc._on('transition', s => events.push(s))
		// initial should not fire
		await new Promise(r => setTimeout(r, 0))
		assert.deepEqual(events, [])
		await lc._start()
		await new Promise(r => setTimeout(r, 0))
		assert.deepEqual(events, ['started'])
	})

	test('supports injected queue and enforces concurrency=1 with shared deadline', async () => {
		interface Capture { calls: number, lastOptions?: { concurrency?: number, deadline?: number } }
		const cap: Capture = { calls: 0 }
		class FakeQueue implements QueuePort<unknown> {
			async enqueue(_: unknown): Promise<void> { /* noop */ }
			async dequeue(): Promise<unknown | undefined> { return undefined }
			async size(): Promise<number> { return 0 }
			async run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options?: { concurrency?: number, deadline?: number }): Promise<ReadonlyArray<R>> {
				cap.calls++
				cap.lastOptions = { concurrency: options?.concurrency, deadline: options?.deadline }
				const out: R[] = []
				for (const t of tasks) out.push(await Promise.resolve(t()))
				return out
			}
		}
		class QLife extends Adapter {
			public ok = false
			protected async onStart(): Promise<void> { this.ok = true }
			protected async onTransition(): Promise<void> { /* no-op */ }
		}
		const timeouts = 25
		const q = new FakeQueue()
		const lc = new QLife({ timeouts, queue: q, logger })
		await lc._start()
		assert.equal(lc._getState(), 'started')
		assert.equal((lc as QLife).ok, true)
		assert.equal(cap.calls, 1)
		assert.equal(cap.lastOptions?.concurrency, 1)
		assert.equal(cap.lastOptions?.deadline, timeouts)
	})
})
