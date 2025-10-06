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
