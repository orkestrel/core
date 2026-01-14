import { describe, test, assert, expect } from 'vitest'

import { QueueAdapter, NoopLogger } from '@orkestrel/core'

function delay(ms: number) {
	return new Promise<void>(r => setTimeout(r, ms))
}

const logger = new NoopLogger()

describe('Queue suite', () => {
	test('preserves result order with full parallelism', async() => {
		const q = new QueueAdapter({ logger })
		const tasks = [
			async() => {
				await delay(10)
				return 'a'
			},
			async() => {
				await delay(5)
				return 'b'
			},
			async() => {
				await delay(1)
				return 'c'
			},
		]
		const out = await q.run(tasks)
		assert.deepEqual(out, ['a', 'b', 'c'])
	})

	test('respects concurrency cap', async() => {
		const q = new QueueAdapter({ logger })
		let active = 0
		let maxActive = 0
		const makeTask = (ms: number) => async() => {
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

	test('propagates task errors (rejects)', async() => {
		const q = new QueueAdapter({ logger })
		const err = new Error('boom')
		const tasks = [
			async() => 1,
			async() => {
				throw err
			},
			async() => 3,
		]
		await expect(() => q.run(tasks, { concurrency: 2 })).rejects.toThrow('boom')
	})

	test('FIFO enqueue/dequeue preserves order', async() => {
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

	test('dequeue on empty returns undefined', async() => {
		const q = new QueueAdapter<number>({ logger })
		assert.equal(await q.size(), 0)
		assert.equal(await q.dequeue(), undefined)
		await q.enqueue(1)
		assert.equal(await q.dequeue(), 1)
		assert.equal(await q.dequeue(), undefined)
	})

	test('enforces capacity on enqueue', async() => {
		const q = new QueueAdapter<number>({ capacity: 2, logger })
		await q.enqueue(1)
		await q.enqueue(2)
		try {
			await q.enqueue(3)
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			const e = err as { message?: string; code?: string }
			assert.ok(typeof e?.message === 'string' && e.message.includes('capacity exceeded'))
			assert.equal(e.code, 'ORK1050')
		}
		assert.equal(await q.size(), 2)
	})

	test('dequeue after capacity enforcement still works', async() => {
		const q = new QueueAdapter<string>({ capacity: 1, logger })
		await q.enqueue('a')
		await expect(() => q.enqueue('b')).rejects.toThrow()
		const v = await q.dequeue()
		assert.equal(v, 'a')
		assert.equal(await q.size(), 0)
	})

	test('run with concurrency=1 runs tasks sequentially and preserves order', async() => {
		const q = new QueueAdapter({ logger })
		let active = 0
		let maxActive = 0
		const mk = (ms: number, out: string) => async() => {
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

	test('run supports per-task timeout', async() => {
		const q = new QueueAdapter({ logger })
		const tasks = [
			async() => {
				await delay(30)
				return 'a'
			},
			async() => {
				await delay(5)
				return 'b'
			},
		]
		try {
			await q.run(tasks, { concurrency: 2, timeout: 10 })
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			const e = err as { message?: string; code?: string }
			assert.ok(typeof e?.message === 'string' && e.message.includes('timed out'))
			assert.equal(e.code, 'ORK1052')
		}
	})

	test('run with deadline enforces shared time budget across tasks', async() => {
		const q = new QueueAdapter({ logger })
		const tasks = [
			async() => {
				await delay(10)
				return 1
			},
			async() => {
				await delay(10)
				return 2
			},
			async() => {
				await delay(10)
				return 3
			},
		]
		try {
			await q.run(tasks, { concurrency: 1, deadline: 15 })
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			const e = err as { message?: string; code?: string }
			assert.ok(typeof e?.message === 'string' && e.message.includes('shared deadline exceeded'))
			assert.equal(e.code, 'ORK1053')
		}
	})

	test('run with abort signal stops scheduling and rejects', async() => {
		const q = new QueueAdapter({ logger })
		const controller = new AbortController()
		let started = 0
		const mk = (ms: number) => async() => {
			started++
			await delay(ms)
			return ms
		}
		const tasks = [mk(50), mk(50), mk(50), mk(50)]
		const p = q.run(tasks, { concurrency: 2, signal: controller.signal })
		setTimeout(() => controller.abort(), 10)
		try {
			await p
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			const e = err as { message?: string; code?: string }
			assert.ok(typeof e?.message === 'string' && e.message.includes('aborted'))
			assert.equal(e.code, 'ORK1051')
		}
		assert.ok(started >= 1)
	})

	test('run with no tasks returns empty array', async() => {
		const q = new QueueAdapter({ logger })
		const out = await q.run([])
		assert.deepEqual(out, [])
	})
})
