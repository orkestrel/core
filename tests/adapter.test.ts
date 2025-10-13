import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { Adapter, NoopLogger } from '@orkestrel/core'

const logger = new NoopLogger()

class MyAdapter extends Adapter {
	public calls: string[] = []
	protected async onCreate(): Promise<void> { this.calls.push('create') }
	protected async onStart(): Promise<void> { this.calls.push('start') }
	protected async onStop(): Promise<void> { this.calls.push('stop') }
	protected async onDestroy(): Promise<void> { this.calls.push('destroy') }
}

describe('Adapter suite', () => {
	test('inherits Lifecycle behavior and invokes protected hooks', async () => {
		const a = new MyAdapter({ logger })
		assert.equal(a.state, 'created')
		await a.create()
		await a.start()
		await a.stop()
		await a.destroy()
		assert.deepStrictEqual(
			{ calls: a.calls, state: a.state },
			{ calls: ['create', 'start', 'stop', 'destroy'], state: 'destroyed' },
		)
	})
})
