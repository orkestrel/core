import { describe, test, assert } from 'vitest'
import { createToken,
	createTokens,
	isTokenRecord } from '@orkestrel/core'

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
})
