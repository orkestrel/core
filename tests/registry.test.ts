import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { RegistryAdapter, NoopLogger } from '@orkestrel/core'

const logger = new NoopLogger()

describe('Registry suite', () => {
	test('with symbol default: construct/get/resolve/list and protect default', () => {
		const DEF = Symbol('def')
		const reg = new RegistryAdapter<number>({ label: 'thing', default: { key: DEF, value: 42 }, logger })
		// resolve/get default
		assert.deepStrictEqual(
			{ resolve: reg.resolve(), get: reg.get(), sawNonString: reg.list().some(k => typeof k !== 'string') },
			{ resolve: 42, get: 42, sawNonString: true },
		)
		// default cannot be replaced or cleared (even forced)
		assert.throws(() => reg.set(DEF, 7), /Cannot replace default/)
		assert.equal(reg.clear(undefined, true), false)
	})

	test('supports string and symbol named keys with default present', () => {
		const DEF = Symbol('def')
		const reg = new RegistryAdapter<string>({ label: 'thing', default: { key: DEF, value: 'default' }, logger })
		reg.set('alpha', 'A')
		const S = Symbol('beta')
		reg.set(S, 'B')
		assert.deepStrictEqual(
			{ def: reg.resolve(), alpha: reg.resolve('alpha'), beta: reg.resolve(S), clearedAlpha: reg.clear('alpha') },
			{ def: 'default', alpha: 'A', beta: 'B', clearedAlpha: true },
		)
		assert.throws(() => reg.resolve('alpha'), /No thing instance registered/)
	})

	test('clear on non-existent names returns false and is non-destructive', () => {
		const DEF = Symbol('def')
		const reg = new RegistryAdapter<number>({ label: 'thing', default: { key: DEF, value: 1 }, logger })
		// clearing unknowns returns false and does not affect entries
		assert.equal(reg.clear('missing'), false)
		assert.equal(reg.clear(Symbol('notset')), false)
		// set some entries
		reg.set('a', 2)
		const before = [...reg.list()]
		// clear unknown string and symbol
		assert.equal(reg.clear('b'), false)
		assert.equal(reg.clear(Symbol('notset')), false)
		// contents unchanged and values still retrievable
		assert.deepEqual([...reg.list()].sort((a, b) => String(a).localeCompare(String(b))), before.sort((a, b) => String(a).localeCompare(String(b))))
		assert.deepStrictEqual(
			{ def: reg.resolve(), a: reg.resolve('a') },
			{ def: 1, a: 2 },
		)
	})

	test('resolve without default throws; get returns undefined', () => {
		const r = new RegistryAdapter<number>({ label: 'num', logger })
		assert.equal(r.get(), undefined)
		assert.throws(() => r.resolve(), /No num instance registered/)
	})

	test('lock prevents overwrite and force allows clear', () => {
		const r = new RegistryAdapter<number>({ label: 'num', default: { value: 1 }, logger })
		r.set('x', 5, true)
		assert.throws(() => r.set('x', 6), /Cannot replace locked/)
		assert.deepStrictEqual(
			{ clearNoForce: r.clear('x'), clearForced: r.clear('x', true), getX: r.get('x'), def: r.resolve() },
			{ clearNoForce: false, clearForced: true, getX: undefined, def: 1 },
		)
	})
})
