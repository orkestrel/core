import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Registry } from '@orkestrel/core'

test('Registry with symbol default: setDefault/get/clear/list', () => {
	const DEF = Symbol('def')
	const reg = new Registry<number>('thing', DEF)
	// get should throw before set
	assert.throws(() => reg.get(), /No thing instance registered/)
	// set default and get
	reg.setDefault(42)
	assert.equal(reg.get(), 42)
	// tryGet returns value
	assert.equal(reg.tryGet(), 42)
	// list contains default symbol key
	assert.ok(reg.list().some(k => typeof k === 'symbol'))
	// clear default
	assert.equal(reg.clear(), true)
	assert.equal(reg.tryGet(), undefined)
})

test('Registry supports string and symbol named keys', () => {
	const DEF = Symbol('def')
	const reg = new Registry<string>('thing', DEF)
	reg.setDefault('default')
	reg.set('alpha', 'A')
	const S = Symbol('beta')
	reg.set(S, 'B')
	assert.equal(reg.get(), 'default')
	assert.equal(reg.get('alpha'), 'A')
	assert.equal(reg.get(S), 'B')
	// clear named
	assert.equal(reg.clear('alpha'), true)
	assert.throws(() => reg.get('alpha'), /No thing instance registered/)
})
