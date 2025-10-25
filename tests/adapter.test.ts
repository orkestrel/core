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
	test('static singleton methods manage lifecycle and invoke protected hooks', async () => {
		// Use static methods for singleton pattern
		await MyAdapter.create({ logger })
		assert.equal(MyAdapter.getState(), 'created')
		await MyAdapter.start()
		assert.equal(MyAdapter.getState(), 'started')
		await MyAdapter.stop()
		assert.equal(MyAdapter.getState(), 'stopped')
		await MyAdapter.destroy()
		assert.equal(MyAdapter.getState(), 'created') // destroyed, no instance exists

		// Verify hooks were called by checking the singleton instance
		await MyAdapter.start({ logger })
		const instance = MyAdapter.getInstance() as MyAdapter
		assert.deepStrictEqual(instance.calls, ['start'])
		await MyAdapter.stop()
		await MyAdapter.destroy()
	})
})
