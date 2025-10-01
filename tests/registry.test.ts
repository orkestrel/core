import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Registry } from '@orkestrel/core'

test('Registry with symbol default: setDefault/get/clear/list', () => {
	const DEF = Symbol('def')
	const reg = new Registry<number>('thing', DEF)
	// get should throw before set via resolve
	assert.throws(() => reg.resolve(), /No thing instance registered/)
	// set default and get
	reg.setDefault(42)
	assert.equal(reg.resolve(), 42)
	// get (optional) returns value
	assert.equal(reg.get(), 42)
	// list contains default symbol key
	assert.ok(reg.list().some(k => typeof k !== 'string'))
	// clear default
	assert.equal(reg.clear(), true)
	assert.equal(reg.get(), undefined)
})

test('Registry supports string and symbol named keys', () => {
	const DEF = Symbol('def')
	const reg = new Registry<string>('thing', DEF)
	reg.setDefault('default')
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
	const reg = new Registry<number>('thing', DEF)
	// nothing set yet; clearing default or named should return false
	assert.equal(reg.clear(), false)
	assert.equal(reg.clear('missing'), false)
	// set some entries
	reg.setDefault(1)
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
