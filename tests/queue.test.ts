import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QueueAdapter } from '@orkestrel/core'

function delay(ms: number) {
	return new Promise<void>(r => setTimeout(r, ms))
}

test('QueueAdapter preserves result order with full parallelism', async () => {
	const q = new QueueAdapter()
	const tasks = [
		async () => {
			await delay(10)
			return 'a'
		},
		async () => {
			await delay(5)
			return 'b'
		},
		async () => {
			await delay(1)
			return 'c'
		},
	]
	const out = await q.run(tasks)
	assert.deepEqual(out, ['a', 'b', 'c'])
})

test('QueueAdapter respects concurrency cap', async () => {
	const q = new QueueAdapter()
	let active = 0
	let maxActive = 0
	const makeTask = (ms: number) => async () => {
		active++
		maxActive = Math.max(maxActive, active)
		await delay(ms)
		active--
		return ms
	}
	const tasks = [50, 50, 50, 50, 50, 50].map(ms => makeTask(ms))
	const cap = 2
	const out = await q.run(tasks, { concurrency: cap })
	assert.equal(out.length, tasks.length)
	assert.ok(maxActive <= cap, `max active ${maxActive} should be <= ${cap}`)
})

test('QueueAdapter propagates task errors (rejects)', async () => {
	const q = new QueueAdapter()
	const err = new Error('boom')
	const tasks = [
		async () => 1,
		async () => { throw err },
		async () => 3,
	]
	await assert.rejects(() => q.run(tasks, { concurrency: 2 }), { message: 'boom' })
})

test('QueueAdapter FIFO: enqueue/dequeue preserves order', async () => {
	const q = new QueueAdapter<string>()
	await q.enqueue('a')
	await q.enqueue('b')
	await q.enqueue('c')
	assert.equal(await q.size(), 3)
	assert.equal(await q.dequeue(), 'a')
	assert.equal(await q.dequeue(), 'b')
	assert.equal(await q.dequeue(), 'c')
	assert.equal(await q.size(), 0)
})

test('QueueAdapter dequeue on empty returns undefined', async () => {
	const q = new QueueAdapter<number>()
	assert.equal(await q.size(), 0)
	assert.equal(await q.dequeue(), undefined)
	await q.enqueue(1)
	assert.equal(await q.dequeue(), 1)
	assert.equal(await q.dequeue(), undefined)
})

test('QueueAdapter enforces capacity on enqueue', async () => {
	const q = new QueueAdapter<number>({ capacity: 2 })
	await q.enqueue(1)
	await q.enqueue(2)
	await assert.rejects(() => q.enqueue(3), /capacity exceeded/)
	assert.equal(await q.size(), 2)
})

test('QueueAdapter dequeue after capacity enforcement still works', async () => {
	const q = new QueueAdapter<string>({ capacity: 1 })
	await q.enqueue('a')
	await assert.rejects(() => q.enqueue('b'))
	const v = await q.dequeue()
	assert.equal(v, 'a')
	assert.equal(await q.size(), 0)
})
