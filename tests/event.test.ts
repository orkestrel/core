import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventAdapter, NoopLogger } from '@orkestrel/core'

const logger = new NoopLogger()

test('Event suite', async (t) => {
	await t.test('subscribe/publish sequentially and unsubscribe', async () => {
		const ev = new EventAdapter({ logger })
		const seen: number[] = []
		const unsub = await ev.subscribe<number>('t', (n) => {
			seen.push(n)
		})
		await ev.publish('t', 1)
		await ev.publish('t', 2)
		assert.deepEqual(seen, [1, 2])
		await unsub()
		await ev.publish('t', 3)
		assert.deepEqual(seen, [1, 2])
	})

	await t.test('concurrent publish isolates handler errors', async () => {
		let errCount = 0
		const ev = new EventAdapter({ onError: () => {
			errCount++
		}, sequential: false, logger })
		await ev.subscribe('t', async () => {
			throw new Error('boom')
		})
		let called = false
		await ev.subscribe('t', async () => {
			called = true
		})
		await ev.publish('t', 'x')
		assert.equal(errCount, 1)
		assert.equal(called, true)
	})

	await t.test('topics return active topics and clean up', async () => {
		const bus = new EventAdapter({ logger })
		assert.deepEqual(bus.topics(), [])
		const offA = await bus.subscribe('A', async () => {
			// no-op
		})
		const offB1 = await bus.subscribe('B', async () => {
			// no-op
		})
		const offB2 = await bus.subscribe('B', async () => {
			// no-op
		})
		const topics1 = [...bus.topics()].sort()
		assert.deepEqual(topics1, ['A', 'B'])
		// unsubscribe one of B, should still be present
		await offB1()
		assert.deepEqual([...bus.topics()].sort(), ['A', 'B'])
		await offB2()
		// B should be removed now; A remains
		assert.deepEqual(bus.topics(), ['A'])
		await offA()
		assert.deepEqual(bus.topics(), [])
	})

	await t.test('handler can unsubscribe itself during publish', async () => {
		const bus = new EventAdapter({ logger })
		let calls = 0
		const off = await bus.subscribe('self', async () => {
			calls++
			await off()
		})
		await bus.publish('self', null)
		await bus.publish('self', null)
		assert.equal(calls, 1)
	})
})
