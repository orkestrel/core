import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RegistryAdapter, NoopLogger } from '@orkestrel/core'

test('Registry suite', async (t) => {
	await t.test('with symbol default: construct/get/resolve/list and protect default', () => {
		const DEF = Symbol('def')
		const reg = new RegistryAdapter<number>({ label: 'thing', default: { key: DEF, value: 42 }, logger: new NoopLogger() })
		// resolve/get default
		assert.equal(reg.resolve(), 42)
		assert.equal(reg.get(), 42)
		// list contains default symbol key
		assert.ok(reg.list().some(k => typeof k !== 'string'))
		// default cannot be replaced or cleared (even forced)
		assert.throws(() => reg.set(DEF, 7), /Cannot replace default/)
		assert.equal(reg.clear(undefined, true), false)
	})

	await t.test('supports string and symbol named keys with default present', () => {
		const DEF = Symbol('def')
		const reg = new RegistryAdapter<string>({ label: 'thing', default: { key: DEF, value: 'default' }, logger: new NoopLogger() })
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

	await t.test('clear on non-existent names returns false and is non-destructive', () => {
		const DEF = Symbol('def')
		const reg = new RegistryAdapter<number>({ label: 'thing', default: { key: DEF, value: 1 }, logger: new NoopLogger() })
		// clearing unknowns returns false and does not affect entries
		assert.equal(reg.clear('missing'), false)
		assert.equal(reg.clear(Symbol('notset')), false)
		// set some entries
		reg.set('a', 2)
		const before = [...reg.list()]
		// clear unknown string and symbol
		assert.equal(reg.clear('b'), false)
		assert.equal(reg.clear(Symbol('notset')), false)
		// contents unchanged
		assert.deepEqual([...reg.list()].sort((a, b) => String(a).localeCompare(String(b))), before.sort((a, b) => String(a).localeCompare(String(b))))
		// values still retrievable
		assert.equal(reg.resolve(), 1)
		assert.equal(reg.resolve('a'), 2)
	})

	await t.test('resolve without default throws; get returns undefined', () => {
		const r = new RegistryAdapter<number>({ label: 'num', logger: new NoopLogger() })
		assert.equal(r.get(), undefined)
		assert.throws(() => r.resolve(), /No num instance registered/)
	})

	await t.test('lock prevents overwrite and force allows clear', () => {
		const r = new RegistryAdapter<number>({ label: 'num', default: { value: 1 }, logger: new NoopLogger() })
		r.set('x', 5, true)
		assert.throws(() => r.set('x', 6), /Cannot replace locked/)
		assert.equal(r.clear('x'), false)
		assert.equal(r.clear('x', true), true)
		assert.equal(r.get('x'), undefined)
		assert.equal(r.resolve(), 1)
	})
})
