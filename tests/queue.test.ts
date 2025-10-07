import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QueueAdapter } from '@orkestrel/core'

function delay(ms: number) {
	return new Promise<void>(r => setTimeout(r, ms))
}

test('Queue | preserves result order with full parallelism', async () => {
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

test('Queue | respects concurrency cap', async () => {
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

test('Queue | propagates task errors (rejects)', async () => {
	const q = new QueueAdapter()
	const err = new Error('boom')
	const tasks = [
		async () => 1,
		async () => { throw err },
		async () => 3,
	]
	await assert.rejects(() => q.run(tasks, { concurrency: 2 }), { message: 'boom' })
})

test('Queue | FIFO enqueue/dequeue preserves order', async () => {
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

test('Queue | dequeue on empty returns undefined', async () => {
	const q = new QueueAdapter<number>()
	assert.equal(await q.size(), 0)
	assert.equal(await q.dequeue(), undefined)
	await q.enqueue(1)
	assert.equal(await q.dequeue(), 1)
	assert.equal(await q.dequeue(), undefined)
})

test('Queue | enforces capacity on enqueue', async () => {
	const q = new QueueAdapter<number>({ capacity: 2 })
	await q.enqueue(1)
	await q.enqueue(2)
	await assert.rejects(() => q.enqueue(3), /capacity exceeded/)
	assert.equal(await q.size(), 2)
})

test('Queue | dequeue after capacity enforcement still works', async () => {
	const q = new QueueAdapter<string>({ capacity: 1 })
	await q.enqueue('a')
	await assert.rejects(() => q.enqueue('b'))
	const v = await q.dequeue()
	assert.equal(v, 'a')
	assert.equal(await q.size(), 0)
})

test('Queue | run with concurrency=1 runs tasks sequentially and preserves order', async () => {
	const q = new QueueAdapter()
	let active = 0
	let maxActive = 0
	const mk = (ms: number, out: string) => async () => {
		active++
		maxActive = Math.max(maxActive, active)
		await delay(ms)
		active--
		return out
	}
	const tasks = [mk(10, 'a'), mk(5, 'b'), mk(1, 'c')]
	const res = await q.run(tasks, { concurrency: 1 })
	assert.deepEqual(res, ['a', 'b', 'c'])
	assert.equal(maxActive, 1)
})

test('Queue | run supports per-task timeout', async () => {
	const q = new QueueAdapter()
	const tasks = [
		async () => {
			await delay(30)
			return 'a'
		},
		async () => {
			await delay(5)
			return 'b'
		},
	]
	await assert.rejects(() => q.run(tasks, { concurrency: 2, timeout: 10 }), /timed out/)
})

test('Queue | run with deadline enforces shared time budget across tasks', async () => {
	const q = new QueueAdapter()
	const tasks = [
		async () => {
			await delay(10)
			return 1
		},
		async () => {
			await delay(10)
			return 2
		},
		async () => {
			await delay(10)
			return 3
		},
	]
	await assert.rejects(() => q.run(tasks, { concurrency: 1, deadline: 15 }), /shared deadline exceeded/)
})

test('Queue | run with abort signal stops scheduling and rejects', async () => {
	const q = new QueueAdapter()
	const controller = new AbortController()
	let started = 0
	const mk = (ms: number) => async () => {
		started++
		await delay(ms)
		return ms
	}
	const tasks = [mk(50), mk(50), mk(50), mk(50)]
	const p = q.run(tasks, { concurrency: 2, signal: controller.signal })
	setTimeout(() => controller.abort(), 10)
	await assert.rejects(() => p, /aborted/)
	assert.ok(started >= 1) // at least one task started before abort
})
