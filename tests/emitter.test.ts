import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EmitterAdapter } from '@orkestrel/core'

test('Emitter on/emit calls listeners with args', () => {
	const em = new EmitterAdapter()
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

test('Emitter off removes a specific listener', () => {
	const em = new EmitterAdapter()
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

test('Emitter removeAllListeners clears all', () => {
	const em = new EmitterAdapter()
	let count = 0
	function l() {
		count++
	}
	em.on('x', l)

	em.removeAllListeners()

	em.emit('x')
	assert.equal(count, 0)
})
