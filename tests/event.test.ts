import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventAdapter } from '@orkestrel/core'

test('EventAdapter: subscribe, publish sequentially, unsubscribe', async () => {
	const ev = new EventAdapter()
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

test('EventAdapter: concurrent publish isolates handler errors', async () => {
	let errCount = 0
	const ev = new EventAdapter({
		onError: () => { errCount++ },
		sequential: false,
	})
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

test('EventAdapter topics() reflects active subscriptions and cleanup', async () => {
	const bus = new EventAdapter()
	assert.deepEqual(bus.topics(), [])
	const offA = await bus.subscribe('A', async () => {})
	const offB1 = await bus.subscribe('B', async () => {})
	const offB2 = await bus.subscribe('B', async () => {})
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
