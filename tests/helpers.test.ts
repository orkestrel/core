import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import type { LifecycleErrorDetail } from '@orkestrel/core'
import { FakeLogger,
	isValueProvider,
	isFactoryProvider,
	isFactoryProviderNoDeps,
	isFactoryProviderWithObject,
	isFactoryProviderWithTuple,
	isClassProvider,
	isClassProviderNoDeps,
	isClassProviderWithTuple,
	safeInvoke,
	isTokenRecord,
	createToken,
	createTokens,
	DiagnosticAdapter,
	isAggregateLifecycleError,
	isLifecycleErrorDetail } from '@orkestrel/core'

const logger = new FakeLogger()

describe('helpers suite', () => {
	test('createToken and createTokens', () => {
		const T = createToken<number>('num')
		assert.equal(typeof T, 'symbol')
		assert.equal(T.description, 'num')
		const Ts = createTokens('ns', { a: 1 as number, b: '' as string })
		assert.equal(Object.keys(Ts).length, 2)
		assert.equal(Ts.a.description, 'ns:a')
		assert.equal(Ts.b.description, 'ns:b')
	})

	test('provider guards: value/factory/class variants', () => {
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

	test('safeInvoke never throws and still calls function', () => {
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

	test('isTokenRecord identifies objects with token values only', () => {
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		const good = { a: A, b: B }
		assert.equal(isTokenRecord(good), true)
		assert.equal(isTokenRecord([]), false)
		assert.equal(isTokenRecord([A]), false)
		assert.equal(isTokenRecord({ a: A, x: 1 }), false)
		assert.equal(isTokenRecord({}), true)
	})

	test('isAggregateLifecycleError returns true for valid shape', () => {
		const d = new DiagnosticAdapter({ logger })
		try {
			d.aggregate('ORK1017', [new Error('x'), new Error('y')], { message: 'agg2' })
			assert.fail('should throw')
		}
		catch (e) {
			assert.equal(isAggregateLifecycleError(e), true)
		}
	})

	test('isAggregateLifecycleError returns false for invalid shapes', () => {
		assert.equal(isAggregateLifecycleError(null), false)
		assert.equal(isAggregateLifecycleError({}), false)
		assert.equal(isAggregateLifecycleError({ details: [], errors: [] }), true) // empty arrays still match schema
		assert.equal(isAggregateLifecycleError({ details: [{ tokenDescription: 'x' }], errors: [] }), false)
		assert.equal(isAggregateLifecycleError({ details: [], errors: ['not-an-error'] }), false)
	})

	test('isLifecycleErrorDetail returns true for valid details', () => {
		const e1: LifecycleErrorDetail = { tokenDescription: 'A', phase: 'start', context: 'normal', durationMs: 5, error: new Error('x'), timedOut: false }
		const e2: LifecycleErrorDetail = { tokenDescription: 'B', phase: 'stop', context: 'rollback', durationMs: 1, error: new Error('y'), timedOut: true }
		assert.equal(isLifecycleErrorDetail(e1), true)
		assert.equal(isLifecycleErrorDetail(e2), true)
	})

	test('isLifecycleErrorDetail returns false for invalid shapes', () => {
		assert.equal(isLifecycleErrorDetail(null), false)
		assert.equal(isLifecycleErrorDetail({}), false)
		assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x' }), false)
		assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x', phase: 'start', context: 'normal', timedOut: false, durationMs: 'nope', error: new Error('z') }), false)
		assert.equal(isLifecycleErrorDetail({ tokenDescription: 'x', phase: 'start', context: 'normal', timedOut: false, durationMs: 1, error: 'err' }), false)
	})
})
