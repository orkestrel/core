import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { LifecycleState, QueuePort } from '@orkestrel/core'
import { Lifecycle, InvalidTransitionError, NoopLogger } from '@orkestrel/core'

const logger = new NoopLogger()

class TestLifecycle extends Lifecycle {
	public log: string[] = []
	protected async onCreate(): Promise<void> { this.log.push('create') }
	protected async onStart(): Promise<void> { this.log.push('start') }
	protected async onStop(): Promise<void> { this.log.push('stop') }
	protected async onDestroy(): Promise<void> { this.log.push('destroy') }
}

class FailingStart extends Lifecycle {
	protected async onStart(): Promise<void> {
		throw new Error('boom')
	}
}
class HangingStart extends Lifecycle {
	protected async onStart(): Promise<void> {
		await new Promise(() => {})
	}
}

test('Lifecycle | happy path transitions', async () => {
	const lc = new TestLifecycle({ timeouts: 100, logger })
	await lc.create()
	assert.equal(lc.state, 'created')
	await lc.start()
	assert.equal(lc.state, 'started')
	await lc.stop()
	assert.equal(lc.state, 'stopped')
	await lc.start()
	assert.equal(lc.state, 'started')
	await lc.destroy()
	assert.equal(lc.state, 'destroyed')
	assert.deepEqual(lc.log, ['create', 'start', 'stop', 'start', 'destroy'])
})

test('Lifecycle | failing start wraps error', async () => {
	const lc = new FailingStart({ timeouts: 50, logger })
	await assert.rejects(() => lc.start(), /Hook 'start' failed/)
	assert.equal(lc.state, 'created')
})

test('Lifecycle | hook timeout triggers TimeoutError', async () => {
	const lc = new HangingStart({ timeouts: 10, logger })
	await assert.rejects(() => lc.start(), /timed out/)
	assert.equal(lc.state, 'created')
})

test('Lifecycle | invalid transition throws', async () => {
	const lc = new TestLifecycle({ logger })
	await lc.start()
	await assert.rejects(async () => lc.create(), (err: unknown) => {
		assert.ok(err instanceof InvalidTransitionError)
		assert.match((err as Error).message, /Invalid lifecycle transition/)
		return true
	})
	await lc.destroy()
	await assert.rejects(() => lc.start(), /Invalid lifecycle transition/)
})

test('Lifecycle | onTransition runs between hook and state change (filterable in override)', async () => {
	class Transitions extends Lifecycle {
		public transitions: string[] = []
		protected async onStart(): Promise<void> { /* no-op */ }
		protected async onStop(): Promise<void> { /* no-op */ }
		protected async onTransition(from: LifecycleState, to: LifecycleState, hook: 'create' | 'start' | 'stop' | 'destroy'): Promise<void> {
			// filter internally to only record 'start' transitions
			if (hook === 'start') this.transitions.push(`${from}->${to}:${hook}`)
		}
	}

	const lc = new Transitions({ timeouts: 50, logger })
	await lc.start()
	assert.equal(lc.state, 'started')
	await lc.stop()
	assert.equal(lc.state, 'stopped')
	assert.deepEqual(lc.transitions, [
		'created->started:start',
	])
})

test('Lifecycle | onTransition timeout surfaces as TimeoutError', async () => {
	class SlowTransition extends Lifecycle {
		protected async onStart(): Promise<void> { /* ok */ }
		protected async onTransition(): Promise<void> { await new Promise(() => {}) }
	}
	const lc = new SlowTransition({ timeouts: 10, logger })
	await assert.rejects(() => lc.start(), /timed out/)
	assert.equal(lc.state, 'created')
})

test('Lifecycle | transition not emitted twice for created->created on create()', async () => {
	const events: LifecycleState[] = []
	class L extends Lifecycle {
		protected async onCreate(): Promise<void> { /* no-op */ }
	}
	const lc = new L({ timeouts: 20, logger })
	lc.on('transition', s => events.push(s))
	// allow initial microtask to flush
	await new Promise(r => setTimeout(r, 0))
	assert.deepEqual(events, ['created'])
	await lc.create()
	// no new event for created->created
	await new Promise(r => setTimeout(r, 0))
	assert.deepEqual(events, ['created'])
})

test('Lifecycle | emitInitial=false suppresses initial transition', async () => {
	const events: LifecycleState[] = []
	class L extends Lifecycle {
		protected async onStart(): Promise<void> { /* no-op */ }
	}
	const lc = new L({ timeouts: 20, emitInitial: false, logger })
	lc.on('transition', s => events.push(s))
	// initial should not fire
	await new Promise(r => setTimeout(r, 0))
	assert.deepEqual(events, [])
	await lc.start()
	await new Promise(r => setTimeout(r, 0))
	assert.deepEqual(events, ['started'])
})

test('Lifecycle | supports injected queue and enforces concurrency=1 with shared deadline', async () => {
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
	class QLife extends Lifecycle {
		public ok = false
		protected async onStart(): Promise<void> { this.ok = true }
		protected async onTransition(): Promise<void> { /* no-op */ }
	}
	const timeouts = 25
	const q = new FakeQueue()
	const lc = new QLife({ timeouts, queue: q, logger })
	await lc.start()
	assert.equal(lc.state, 'started')
	assert.equal(lc instanceof QLife, true)
	assert.equal((lc as QLife).ok, true)
	assert.equal(cap.calls, 1)
	assert.equal(cap.lastOptions?.concurrency, 1)
	assert.equal(cap.lastOptions?.deadline, timeouts)
})
