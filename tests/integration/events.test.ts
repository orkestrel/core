/**
 * Integration Tests: Event System
 *
 * End-to-end tests for EmitterAdapter and EventAdapter
 * working together in realistic scenarios.
 */

import { describe, test, assert } from 'vitest'
import {
	EmitterAdapter,
	EventAdapter,
	NoopLogger,
} from '../../src/index.js'

const logger = new NoopLogger()

describe('Integration: Event System', () => {
	// =========================================================================
	// Emitter Integration
	// =========================================================================

	test('emitter handles multiple event types', () => {
		type AppEvents = {
			'user:login': [{ userId: string; timestamp: number }]
			'user:logout': [{ userId: string }]
			'error': [Error]
			'metrics': [string, number]
		}

		const emitter = new EmitterAdapter<AppEvents>({ logger })
		const events: string[] = []

		emitter.on('user:login', ({ userId }) => events.push(`login:${userId}`))
		emitter.on('user:logout', ({ userId }) => events.push(`logout:${userId}`))
		emitter.on('error', (err) => events.push(`error:${err.message}`))
		emitter.on('metrics', (name, value) => events.push(`metric:${name}=${value}`))

		emitter.emit('user:login', { userId: 'u1', timestamp: Date.now() })
		emitter.emit('metrics', 'requests', 100)
		emitter.emit('user:logout', { userId: 'u1' })
		emitter.emit('error', new Error('test error'))

		assert.deepEqual(events, [
			'login:u1',
			'metric:requests=100',
			'logout:u1',
			'error:test error',
		])
	})

	test('emitter handles concurrent listeners on same event', () => {
		const emitter = new EmitterAdapter({ logger })
		const results: number[] = []

		// Add 10 listeners
		for (let i = 0; i < 10; i++) {
			const id = i
			emitter.on('data', () => results.push(id))
		}

		emitter.emit('data')

		assert.equal(results.length, 10)
		assert.deepEqual(results, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
	})

	test('emitter isolates listener errors', () => {
		const emitter = new EmitterAdapter({ logger })
		const results: string[] = []

		emitter.on('test', () => results.push('first'))
		emitter.on('test', () => {
			throw new Error('boom')
		})
		emitter.on('test', () => results.push('third'))

		// Should not throw
		emitter.emit('test')

		// First and third still executed
		assert.deepEqual(results, ['first', 'third'])
	})

	test('emitter unsubscribe during emit', () => {
		const emitter = new EmitterAdapter({ logger })
		const results: number[] = []
		let unsub2: (() => void) | null = null

		emitter.on('x', () => {
			results.push(1)
			unsub2?.()
		})
		unsub2 = emitter.on('x', () => results.push(2))
		emitter.on('x', () => results.push(3))

		emitter.emit('x')
		// First emit: 1, 2, 3 (snapshot taken before iteration)
		assert.deepEqual(results, [1, 2, 3])

		results.length = 0
		emitter.emit('x')
		// Second emit: 1, 3 (2 was unsubscribed)
		assert.deepEqual(results, [1, 3])
	})

	// =========================================================================
	// EventBus Integration
	// =========================================================================

	test('event bus publishes to multiple subscribers', async () => {
		const bus = new EventAdapter({ logger, sequential: true })
		const received: string[] = []

		await bus.subscribe('topic', async (payload: string) => {
			received.push(`sub1:${payload}`)
		})

		await bus.subscribe('topic', async (payload: string) => {
			received.push(`sub2:${payload}`)
		})

		await bus.publish('topic', 'hello')

		assert.deepEqual(received, ['sub1:hello', 'sub2:hello'])
	})

	test('event bus handles subscriber errors', async () => {
		const errors: { topic: string; error: unknown }[] = []
		const bus = new EventAdapter({
			logger,
			sequential: true,
			onError: (error, topic) => errors.push({ topic, error }),
		})
		const received: string[] = []

		await bus.subscribe('topic', async () => {
			throw new Error('subscriber error')
		})

		await bus.subscribe('topic', async (payload: string) => {
			received.push(payload)
		})

		await bus.publish('topic', 'test')

		// Error was captured
		assert.equal(errors.length, 1)
		assert.equal(errors[0]?.topic, 'topic')

		// Second subscriber still received message
		assert.deepEqual(received, ['test'])
	})

	test('event bus tracks topics correctly', async () => {
		const bus = new EventAdapter({ logger })

		assert.deepEqual(bus.topics(), [])

		const unsub1 = await bus.subscribe('topic1', async () => {})
		const unsub2 = await bus.subscribe('topic2', async () => {})
		await bus.subscribe('topic1', async () => {}) // Second subscriber to topic1

		const topics = bus.topics()
		assert.ok(topics.includes('topic1'))
		assert.ok(topics.includes('topic2'))
		assert.equal(topics.length, 2)

		unsub1()
		// topic1 still has one subscriber
		assert.ok(bus.topics().includes('topic1'))

		unsub2()
		assert.ok(!bus.topics().includes('topic2'))
	})

	test('event bus concurrent mode', async () => {
		const bus = new EventAdapter({ logger, sequential: false })
		const startTimes: number[] = []
		const endTimes: number[] = []

		await bus.subscribe('concurrent', async () => {
			startTimes.push(Date.now())
			await delay(50)
			endTimes.push(Date.now())
		})

		await bus.subscribe('concurrent', async () => {
			startTimes.push(Date.now())
			await delay(50)
			endTimes.push(Date.now())
		})

		await bus.publish('concurrent', null)

		// Both should start around the same time (concurrent)
		assert.equal(startTimes.length, 2)
		assert.equal(endTimes.length, 2)
		const startDiff = Math.abs((startTimes[0] ?? 0) - (startTimes[1] ?? 0))
		assert.ok(startDiff < 30, 'Subscribers should start concurrently')
	})

	test('event bus sequential mode', async () => {
		const bus = new EventAdapter({ logger, sequential: true })
		const order: number[] = []

		await bus.subscribe('sequential', async () => {
			order.push(1)
			await delay(20)
			order.push(2)
		})

		await bus.subscribe('sequential', async () => {
			order.push(3)
			await delay(20)
			order.push(4)
		})

		await bus.publish('sequential', null)

		// Sequential: 1, 2 complete before 3, 4 start
		assert.deepEqual(order, [1, 2, 3, 4])
	})

	// =========================================================================
	// Combined Emitter + EventBus
	// =========================================================================

	test('emitter triggers event bus publish', async () => {
		const emitter = new EmitterAdapter({ logger })
		const bus = new EventAdapter({ logger })
		const results: string[] = []

		// Event bus subscriber
		await bus.subscribe('notification', async (msg: string) => {
			results.push(`notified:${msg}`)
		})

		// Emitter listener that publishes to bus
		emitter.on('action', async () => {
			await bus.publish('notification', 'Action completed')
		})

		emitter.emit('action')

		// Wait for async publish
		await delay(10)

		assert.deepEqual(results, ['notified:Action completed'])
	})
})

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
