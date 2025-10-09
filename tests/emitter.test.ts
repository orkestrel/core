import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EmitterAdapter, NoopLogger } from '@orkestrel/core'

const logger = new NoopLogger()

test('Emitter suite', async (t) => {
	await t.test('on/emit calls listeners with args', () => {
		const em = new EmitterAdapter({ logger })
		let called = 0
		let payload: unknown[] = []

		em.on('evt', (...args: unknown[]) => {
			called++
			payload = args
		})

		em.emit('evt', 1, 'a')
		assert.equal(called, 1)
		assert.deepEqual(payload, [1, 'a'])
	})

	await t.test('off removes a specific listener', () => {
		const em = new EmitterAdapter({ logger })
		let a = 0
		let b = 0
		function la() {
			a++
		}
		function lb() {
			b++
		}
		em.on('evt', la)
		em.on('evt', lb)

		em.off('evt', la)

		em.emit('evt')
		assert.equal(a, 0)
		assert.equal(b, 1)
	})

	await t.test('removeAllListeners clears all', () => {
		const em = new EmitterAdapter({ logger })
		let count = 0
		function l() {
			count++
		}
		em.on('x', l)

		em.removeAllListeners()

		em.emit('x')
		assert.equal(count, 0)
	})

	await t.test('listener error is isolated and does not throw outward', () => {
		const em = new EmitterAdapter({ logger })
		let okCalled = 0
		em.on('e', () => {
			throw new Error('boom')
		})
		em.on('e', () => {
			okCalled++
		})
		assert.doesNotThrow(() => em.emit('e'))
		assert.equal(okCalled, 1)
	})

	await t.test('listeners are invoked in insertion order', () => {
		const em = new EmitterAdapter({ logger })
		const order: number[] = []
		em.on('o', () => order.push(1))
		em.on('o', () => order.push(2))
		em.on('o', () => order.push(3))
		em.emit('o')
		assert.deepEqual(order, [1, 2, 3])
	})

	await t.test('listener can unsubscribe itself during emit without skipping others', () => {
		const em = new EmitterAdapter({ logger })
		const seen: number[] = []
		const self = () => {
			seen.push(1)
			em.off('x', self)
		}
		const l2 = () => {
			seen.push(2)
		}
		const l3 = () => {
			seen.push(3)
		}
		em.on('x', self)
		em.on('x', l2)
		em.on('x', l3)
		em.emit('x')
		assert.deepEqual(seen, [1, 2, 3])
		// Second emit should call only remaining listeners
		seen.length = 0
		em.emit('x')
		assert.deepEqual(seen, [2, 3])
	})
})
