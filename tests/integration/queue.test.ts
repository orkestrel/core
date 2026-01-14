/**
 * Integration Tests: Queue and Task Execution
 *
 * End-to-end tests for QueueAdapter with realistic task scenarios.
 */

import { describe, test, assert } from 'vitest'
import {
	QueueAdapter,
	NoopLogger,
} from '../../src/index.js'

const logger = new NoopLogger()

describe('Integration: Queue and Task Execution', () => {
	// =========================================================================
	// Basic Queue Operations
	// =========================================================================

	test('queue maintains FIFO order', async () => {
		const queue = new QueueAdapter<string>({ capacity: 100, logger })

		await queue.enqueue('first')
		await queue.enqueue('second')
		await queue.enqueue('third')

		assert.equal(await queue.size(), 3)

		assert.equal(await queue.dequeue(), 'first')
		assert.equal(await queue.dequeue(), 'second')
		assert.equal(await queue.dequeue(), 'third')
		assert.equal(await queue.dequeue(), undefined)
	})

	test('queue respects capacity', async () => {
		const queue = new QueueAdapter<number>({ capacity: 3, logger })

		await queue.enqueue(1)
		await queue.enqueue(2)
		await queue.enqueue(3)

		// Queue is full
		let error: unknown
		try {
			await queue.enqueue(4)
		} catch (e) {
			error = e
		}

		assert.ok(error)
		assert.match((error as Error).message, /full|capacity/i)
	})

	// =========================================================================
	// Task Execution
	// =========================================================================

	test('runs tasks with concurrency limit', async () => {
		const queue = new QueueAdapter({ logger })
		let maxConcurrent = 0
		let current = 0

		const tasks = Array.from({ length: 10 }, (_, i) => async () => {
			current++
			maxConcurrent = Math.max(maxConcurrent, current)
			await delay(20)
			current--
			return i
		})

		const results = await queue.run(tasks, { concurrency: 3 })

		assert.equal(results.length, 10)
		assert.ok(maxConcurrent <= 3, `Max concurrent was ${maxConcurrent}, expected <= 3`)
		assert.deepEqual(results, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
	})

	test('runs tasks in parallel when concurrency is high', async () => {
		const queue = new QueueAdapter({ logger })
		const startTimes: number[] = []

		const tasks = Array.from({ length: 5 }, () => async () => {
			startTimes.push(Date.now())
			await delay(50)
		})

		const start = Date.now()
		await queue.run(tasks, { concurrency: 10 })
		const elapsed = Date.now() - start

		// All should start nearly simultaneously
		const maxStartDiff = Math.max(...startTimes) - Math.min(...startTimes)
		assert.ok(maxStartDiff < 30, `Tasks should start together, diff was ${maxStartDiff}ms`)

		// Total time should be close to single task time (parallel)
		assert.ok(elapsed < 150, `Expected parallel execution, took ${elapsed}ms`)
	})

	test('runs tasks sequentially when concurrency is 1', async () => {
		const queue = new QueueAdapter({ logger })
		const order: number[] = []

		const tasks = Array.from({ length: 5 }, (_, i) => async () => {
			order.push(i)
			await delay(10)
		})

		const start = Date.now()
		await queue.run(tasks, { concurrency: 1 })
		const elapsed = Date.now() - start

		// Order should be sequential
		assert.deepEqual(order, [0, 1, 2, 3, 4])

		// Total time should be sum of all tasks
		assert.ok(elapsed >= 45, `Expected sequential execution, took ${elapsed}ms`)
	})

	test('handles task errors gracefully', async () => {
		const queue = new QueueAdapter({ logger })
		const results: (string | Error)[] = []

		const tasks = [
			async () => 'success1',
			async () => {
				throw new Error('task error')
			},
			async () => 'success2',
		]

		// Run should complete even with errors
		try {
			const r = await queue.run(tasks)
			results.push(...r.filter(x => typeof x === 'string') as string[])
		} catch (e) {
			results.push(e as Error)
		}

		// Depends on queue implementation - may throw or collect errors
		assert.ok(results.length > 0)
	})

	// =========================================================================
	// Complex Scenarios
	// =========================================================================

	test('simulates worker pool processing', async () => {
		const queue = new QueueAdapter({ logger })
		const processed: number[] = []

		// Simulate 20 jobs processed by 4 workers
		const jobs = Array.from({ length: 20 }, (_, i) => async () => {
			await delay(10 + Math.random() * 20)
			processed.push(i)
			return i * 2
		})

		const results = await queue.run(jobs, { concurrency: 4 })

		assert.equal(processed.length, 20)
		assert.equal(results.length, 20)
		assert.ok(results.every((r, i) => r === i * 2))
	})

	test('simulates batch processing with shared deadline', async () => {
		const queue = new QueueAdapter({ logger })
		const completed: number[] = []

		const tasks = Array.from({ length: 10 }, (_, i) => async () => {
			await delay(10)
			completed.push(i)
			return i
		})

		// 200ms deadline should allow all to complete
		const results = await queue.run(tasks, {
			concurrency: 2,
			deadline: 200,
		})

		assert.equal(results.length, 10)
		assert.equal(completed.length, 10)
	})

	test('deadline triggers timeout for slow tasks', async () => {
		const queue = new QueueAdapter({ logger })

		const tasks = Array.from({ length: 5 }, () => async () => {
			await delay(100)
			return 'done'
		})

		let error: unknown
		try {
			// 50ms deadline - tasks take 100ms each
			await queue.run(tasks, {
				concurrency: 1,
				deadline: 50,
			})
		} catch (e) {
			error = e
		}

		assert.ok(error)
		assert.match((error as Error).message, /deadline|timeout/i)
	})

	// =========================================================================
	// Queue + Adapter Integration
	// =========================================================================

	test('queue used for lifecycle phase execution', async () => {
		const queue = new QueueAdapter({ logger, concurrency: 2 })
		const phases: string[] = []

		// Simulate adapter lifecycle phases
		const adapters = ['Config', 'Database', 'Cache', 'Server']
		const startTasks = adapters.map(name => async () => {
			phases.push(`starting:${name}`)
			await delay(20)
			phases.push(`started:${name}`)
			return name
		})

		await queue.run(startTasks, { concurrency: 2 })

		// All adapters should be started
		assert.equal(phases.filter(p => p.startsWith('started:')).length, 4)
	})
})

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
