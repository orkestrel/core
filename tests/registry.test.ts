import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Registry } from '@orkestrel/core'

test('Registry with symbol default: construct/get/resolve/list and protected default', () => {
	const DEF = Symbol('def')
	const reg = new Registry<number>('thing', 42, DEF)
	// resolve/get default
	assert.equal(reg.resolve(), 42)
	assert.equal(reg.get(), 42)
	// list contains default symbol key
	assert.ok(reg.list().some(k => typeof k !== 'string'))
	// default cannot be replaced or cleared (even forced)
	assert.throws(() => reg.set(DEF, 7), /Cannot replace default/)
	assert.equal(reg.clear(undefined, true), false)
})

test('Registry supports string and symbol named keys with default present', () => {
	const DEF = Symbol('def')
	const reg = new Registry<string>('thing', 'default', DEF)
	reg.set('alpha', 'A')
	const S = Symbol('beta')
	reg.set(S, 'B')
	assert.equal(reg.resolve(), 'default')
	assert.equal(reg.resolve('alpha'), 'A')
	assert.equal(reg.resolve(S), 'B')
	// clear named
	assert.equal(reg.clear('alpha'), true)
	assert.throws(() => reg.resolve('alpha'), /No thing instance registered/)
})

test('Registry clear on non-existent names returns false and is non-destructive', () => {
	const DEF = Symbol('def')
	const reg = new Registry<number>('thing', 1, DEF)
	// clearing unknowns returns false and does not affect entries
	assert.equal(reg.clear('missing'), false)
	assert.equal(reg.clear(Symbol('notset')), false)
	// set some entries
	reg.set('a', 2)
	const before = reg.list().slice()
	// clear unknown string and symbol
	assert.equal(reg.clear('b'), false)
	assert.equal(reg.clear(Symbol('notset')), false)
	// contents unchanged
	assert.deepEqual(reg.list().sort((a, b) => String(a).localeCompare(String(b))), before.sort((a, b) => String(a).localeCompare(String(b))))
	// values still retrievable
	assert.equal(reg.resolve(), 1)
	assert.equal(reg.resolve('a'), 2)
})
