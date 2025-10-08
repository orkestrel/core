import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	createToken,
	createTokens,
	isToken,
	hasOwn,
	isValueProvider,
	isFactoryProvider,
	isFactoryProviderNoDeps,
	isFactoryProviderWithObject,
	isFactoryProviderWithTuple,
	isClassProvider,
	isClassProviderNoDeps,
	isClassProviderWithTuple,
	isZeroArg,
	getTag,
	isAsyncFunction,
	isPromiseLike,
	safeInvoke,
	isTokenRecord,
} from '@orkestrel/core'

test('types helpers suite', async (t) => {
	await t.test('tokens: createToken and createTokens', () => {
		const T = createToken<number>('num')
		assert.equal(isToken(T), true)
		assert.equal(typeof T, 'symbol')
		assert.equal(T.description, 'num')
		const Ts = createTokens('ns', { a: 1 as number, b: '' as string })
		assert.equal(Object.keys(Ts).length, 2)
		assert.equal(Ts.a.description, 'ns:a')
		assert.equal(Ts.b.description, 'ns:b')
	})

	await t.test('hasOwn works with prototype-less objects', () => {
		const o = Object.create(null) as Record<string, unknown>
		o.x = 1
		assert.equal(hasOwn(o, 'x'), true)
		assert.equal(hasOwn(o, 'y' as never), false)
	})

	await t.test('provider guards: value/factory/class variants', () => {
		const valueP = { useValue: 42 }
		assert.equal(isValueProvider(valueP), true)
		assert.equal(isFactoryProvider(valueP), false)
		assert.equal(isClassProvider(valueP), false)

		const fNoDeps = { useFactory: () => 'x' }
		const fWithTuple = { useFactory: (a: number, b: string) => `${a}${b}`, inject: [createToken<number>('a'), createToken<string>('b')] as const }
		const fWithObj = { useFactory: (deps: Record<string, unknown>) => Number(deps['a']), inject: { a: createToken<number>('a') } as const }
		assert.equal(isFactoryProvider(fNoDeps), true)
		assert.equal(isFactoryProviderNoDeps(fNoDeps), true)
		assert.equal(isFactoryProviderWithTuple<typeof fWithTuple, [number, string]>(fWithTuple), true)
		assert.equal(isFactoryProviderWithObject(fWithObj), true)

		class C1 { public value = 1 }
		class C2 {
			public a: number
			public b: string
			constructor(a: number, b: string) {
				this.a = a
				this.b = b
			}
		}
		const cNoDeps = { useClass: C1 }
		const cWithTuple = { useClass: C2, inject: [createToken<number>('a'), createToken<string>('b')] as const }
		assert.equal(isClassProvider(cNoDeps), true)
		assert.equal(isClassProviderNoDeps(cNoDeps), true)
		assert.equal(isClassProviderWithTuple<typeof cWithTuple, [number, string]>(cWithTuple), true)
	})

	await t.test('isZeroArg correctly detects zero-arg functions', () => {
		const z = () => 1
		const one = (a: unknown) => a
		assert.equal(isZeroArg(z), true)
		assert.equal(isZeroArg(one as unknown as () => unknown), false)
	})

	await t.test('getTag returns built-in [[Class]] names', () => {
		assert.equal(getTag([]), '[object Array]')
		assert.equal(getTag(Promise.resolve()), '[object Promise]')
		assert.equal(getTag(new Map()), '[object Map]')
	})

	await t.test('isAsyncFunction and isPromiseLike', async () => {
		async function afn() {
			return 1
		}
		function normal() {
			return 1
		}
		function returnsPromise() {
			return Promise.resolve(2)
		}
		const thenable = { then: (r: (v: number) => void) => r(3) }
		assert.equal(isAsyncFunction(afn), true)
		assert.equal(isAsyncFunction(normal), false)
		assert.equal(isAsyncFunction(returnsPromise), false)
		assert.equal(isPromiseLike(Promise.resolve(1)), true)
		assert.equal(isPromiseLike(thenable), true)
		assert.equal(isPromiseLike(normal), false)
		assert.equal(isPromiseLike(null), false)
	})

	await t.test('safeInvoke never throws and still calls function', () => {
		let called = 0
		function good() {
			called++
		}
		function bad() {
			throw new Error('boom')
		}
		safeInvoke(good)
		safeInvoke(bad)
		assert.equal(called, 1)
	})

	await t.test('isTokenRecord identifies objects with token values only', () => {
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		const good = { a: A, b: B }
		assert.equal(isTokenRecord(good), true)
		assert.equal(isTokenRecord([]), false)
		assert.equal(isTokenRecord([A]), false)
		assert.equal(isTokenRecord({ a: A, x: 1 }), false)
		assert.equal(isTokenRecord({}), true)
	})
})
