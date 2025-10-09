import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QueueAdapter, NoopLogger } from '@orkestrel/core'

function delay(ms: number) {
	return new Promise<void>(r => setTimeout(r, ms))
}

const logger = new NoopLogger()

test('Queue suite', async (t) => {
	await t.test('preserves result order with full parallelism', async () => {
		const q = new QueueAdapter({ logger })
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

	await t.test('respects concurrency cap', async () => {
		const q = new QueueAdapter({ logger })
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

	await t.test('propagates task errors (rejects)', async () => {
		const q = new QueueAdapter({ logger })
		const err = new Error('boom')
		const tasks = [
			async () => 1,
			async () => {
				throw err
			},
			async () => 3,
		]
		await assert.rejects(() => q.run(tasks, { concurrency: 2 }), { message: 'boom' })
	})

	await t.test('FIFO enqueue/dequeue preserves order', async () => {
		const q = new QueueAdapter<string>({ logger })
		await q.enqueue('a')
		await q.enqueue('b')
		await q.enqueue('c')
		assert.equal(await q.size(), 3)
		assert.equal(await q.dequeue(), 'a')
		assert.equal(await q.dequeue(), 'b')
		assert.equal(await q.dequeue(), 'c')
		assert.equal(await q.size(), 0)
	})

	await t.test('dequeue on empty returns undefined', async () => {
		const q = new QueueAdapter<number>({ logger })
		assert.equal(await q.size(), 0)
		assert.equal(await q.dequeue(), undefined)
		await q.enqueue(1)
		assert.equal(await q.dequeue(), 1)
		assert.equal(await q.dequeue(), undefined)
	})

	await t.test('enforces capacity on enqueue', async () => {
		const q = new QueueAdapter<number>({ capacity: 2, logger })
		await q.enqueue(1)
		await q.enqueue(2)
		await assert.rejects(() => q.enqueue(3), (err: unknown) => {
			if (!(err instanceof Error)) return false
			const code = (err as Error & { code?: string }).code
			return /capacity exceeded/.test(err.message) && code === 'ORK1050'
		})
		assert.equal(await q.size(), 2)
	})

	await t.test('dequeue after capacity enforcement still works', async () => {
		const q = new QueueAdapter<string>({ capacity: 1, logger })
		await q.enqueue('a')
		await assert.rejects(() => q.enqueue('b'))
		const v = await q.dequeue()
		assert.equal(v, 'a')
		assert.equal(await q.size(), 0)
	})

	await t.test('run with concurrency=1 runs tasks sequentially and preserves order', async () => {
		const q = new QueueAdapter({ logger })
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

	await t.test('run supports per-task timeout', async () => {
		const q = new QueueAdapter({ logger })
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
		await assert.rejects(() => q.run(tasks, { concurrency: 2, timeout: 10 }), (err: unknown) => {
			if (!(err instanceof Error)) return false
			const code = (err as Error & { code?: string }).code
			return /timed out/.test(err.message) && code === 'ORK1052'
		})
	})

	await t.test('run with deadline enforces shared time budget across tasks', async () => {
		const q = new QueueAdapter({ logger })
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
		await assert.rejects(() => q.run(tasks, { concurrency: 1, deadline: 15 }), (err: unknown) => {
			if (!(err instanceof Error)) return false
			const code = (err as Error & { code?: string }).code
			return /shared deadline exceeded/.test(err.message) && code === 'ORK1053'
		})
	})

	await t.test('run with abort signal stops scheduling and rejects', async () => {
		const q = new QueueAdapter({ logger })
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
		await assert.rejects(() => p, (err: unknown) => {
			if (!(err instanceof Error)) return false
			const code = (err as Error & { code?: string }).code
			return /aborted/.test(err.message) && code === 'ORK1051'
		})
		assert.ok(started >= 1)
	})

	await t.test('run with no tasks returns empty array', async () => {
		const q = new QueueAdapter({ logger })
		const out = await q.run([])
		assert.deepEqual(out, [])
	})
})
