import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Lifecycle, InvalidTransitionError } from '@orkestrel/core'

class TestLifecycle extends Lifecycle {
	public log: string[] = []
	protected async onCreate(): Promise<void> { this.log.push('create') }
	protected async onStart(): Promise<void> { this.log.push('start') }
	protected async onStop(): Promise<void> { this.log.push('stop') }
	protected async onDestroy(): Promise<void> { this.log.push('destroy') }
}

class FailingStart extends Lifecycle {
	protected async onStart(): Promise<void> { throw new Error('boom') }
}

class HangingStart extends Lifecycle {
	protected async onStart(): Promise<void> { await new Promise(() => {}) }
}

test('lifecycle happy path transitions', async () => {
	const lc = new TestLifecycle({ hookTimeoutMs: 100 })
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

test('lifecycle failing start wraps error', async () => {
	const lc = new FailingStart({ hookTimeoutMs: 50 })
	await assert.rejects(() => lc.start(), /Hook 'start' failed/)
	assert.equal(lc.state, 'created')
})

test('lifecycle hook timeout triggers TimeoutError', async () => {
	const lc = new HangingStart({ hookTimeoutMs: 10 })
	await assert.rejects(() => lc.start(), /timed out/)
	assert.equal(lc.state, 'created')
})

test('invalid transition throws', async () => {
	const lc = new TestLifecycle()
	await lc.start()
	await assert.rejects(async () => lc.create(), (err: unknown) => {
		assert.ok(err instanceof InvalidTransitionError)
		assert.match((err as Error).message, /Invalid lifecycle transition/)
		return true
	})
	await lc.destroy()
	await assert.rejects(() => lc.start(), /Invalid lifecycle transition/)
})

test('onTransition runs between hook and state change and can be filtered', async () => {
	class Transitions extends Lifecycle {
		public transitions: string[] = []
		protected async onStart(): Promise<void> { /* no-op */ }
		protected async onStop(): Promise<void> { /* no-op */ }
		protected async onTransition(from: any, to: any, hook: any): Promise<void> {
			this.transitions.push(`${from}->${to}:${hook}`)
		}
	}

	const lc = new Transitions({ hookTimeoutMs: 50, onTransitionFilter: (_f, _t, hook) => hook === 'start' })
	await lc.start()
	assert.equal(lc.state, 'started')
	await lc.stop()
	assert.equal(lc.state, 'stopped')
	assert.deepEqual(lc.transitions, [
		'created->started:start',
	])
})

test('onTransition timeout is treated like the main hook and surfaces as TimeoutError', async () => {
	class SlowTransition extends Lifecycle {
		protected async onStart(): Promise<void> { /* ok */ }
		protected async onTransition(): Promise<void> { await new Promise(() => {}) }
	}
	const lc = new SlowTransition({ hookTimeoutMs: 10 })
	await assert.rejects(() => lc.start(), /timed out/)
	assert.equal(lc.state, 'created')
})
