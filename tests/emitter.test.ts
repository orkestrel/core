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
})
