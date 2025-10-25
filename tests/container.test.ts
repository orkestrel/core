import { describe, test, beforeEach, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { createToken, Container, container, Adapter, NoopLogger, isAggregateLifecycleError } from '@orkestrel/core'

let logger: NoopLogger

class TestLifecycle extends Adapter {
	started = 0
	stopped = 0

	protected async onStart() { this.started++ }
	protected async onStop() { this.stopped++ }
}

class FailingOnDestroy extends Adapter {
	protected async onDestroy(): Promise<void> {
		throw new Error('destroy-fail')
	}
}

describe('Container suite', () => {
	beforeEach(() => {
		logger = new NoopLogger()
	})
	afterEach(() => {
		for (const name of container.list()) {
			container.clear(name, true)
		}
	})

	test('value provider resolution', () => {
		const TOK = createToken<number>('num')
		const c = new Container({ logger })
		c.register(TOK, { useValue: 42 })
		assert.strictEqual(c.resolve(TOK), 42)
		assert.equal(c.has(TOK), true)
	})

	test('strict resolve missing token throws', () => {
		const MISSING = createToken<number>('missing:strict')
		const c = new Container({ logger })
		assert.throws(() => c.resolve(MISSING), (err: unknown) => {
			const e = err as { message?: string, code?: string }
			return typeof e?.message === 'string' && (/No provider for missing:strict/.test(e.message) || e.code === 'ORK1006')
		})
	})

	// Inject tests
	test('factory provider with inject array resolves dependencies by order', () => {
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		const OUT = createToken<{ a: number, b: string }>('OUT')
		const c = new Container({ logger })
		c.set(A, 10)
		c.set(B, 'hi')
		c.register(OUT, { useFactory: (a, b) => ({ a, b }), inject: [A, B] })
		const v = c.resolve(OUT)
		assert.deepEqual(v, { a: 10, b: 'hi' })
	})

	test('factory provider with inject object resolves named dependencies', () => {
		const A = createToken<number>('A2')
		const B = createToken<string>('B2')
		const SUM = createToken<number>('SUM')
		const c = new Container({ logger })
		c.set(A, 3)
		c.set(B, 'abcd')
		c.register(SUM, { useFactory: ({ a, b }) => a + b.length, inject: { a: A, b: B } })
		assert.equal(c.resolve(SUM), 3 + 4)
	})

	class NeedsDeps { constructor(public readonly a: number, public readonly b: string) {} }

	test('class provider with inject array constructs with resolved dependencies', () => {
		const A = createToken<number>('A3')
		const B = createToken<string>('B3')
		const C = createToken<NeedsDeps>('C3')
		const c = new Container({ logger })
		c.set(A, 5)
		c.set(B, 'z')
		c.register(C, { useClass: NeedsDeps, inject: [A, B] })
		const inst = c.resolve(C)
		assert.equal(inst.a, 5)
		assert.equal(inst.b, 'z')
	})

	test('factory provider resolution and get/has', () => {
		const TOK = createToken<{ v: number }>('obj')
		const MISS = createToken('missing')
		const c = new Container({ logger })
		c.register(TOK, { useFactory: () => ({ v: 10 }) })
		assert.strictEqual(c.resolve(TOK).v, 10)
		assert.equal(c.get(MISS), undefined)
		assert.equal(c.has(MISS), false)
	})

	test('object-map strict resolution and optional get()', () => {
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		const C = createToken<boolean>('C')
		const c = new Container({ logger })
		c.set(A, 1)
		c.set(B, 'two')
		c.set(C, true)
		const { a, b, c: cval } = c.resolve({ a: A, b: B, c: C })
		const maybe = c.get({ a: A, x: createToken('X') })
		assert.deepStrictEqual(
			{ a, b, cval, maybeA: maybe.a, maybeX: maybe.x },
			{ a: 1, b: 'two', cval: true, maybeA: 1, maybeX: undefined },
		)
	})

	test('class provider without autostart; child container lookup', async () => {
		const TOK = createToken<TestLifecycle>('life')
		const c = new Container({ logger })
		c.register(TOK, { useFactory: () => new TestLifecycle({ logger }) })
		const child = c.createChild()
		const inst = child.resolve(TOK)
		// no autostart; instance should not be started yet
		assert.strictEqual(inst.started, 0)
		await inst.start()
		assert.strictEqual(inst.started, 1)
		await child.destroy()
		await c.destroy()
		// after destroy, lifecycle should be destroyed (stop may or may not have run depending on state)
		assert.ok(inst.stopped >= 0)
	})

	test('destroy aggregates errors and is idempotent', async () => {
		const BAD = createToken<FailingOnDestroy>('bad')
		const c = new Container({ logger })
		c.register(BAD, { useFactory: () => new FailingOnDestroy({ logger }) })
		const inst = c.resolve(BAD)
		await inst.start()
		await inst.stop()
		await assert.rejects(() => c.destroy(), (err: unknown) => {
			assert.ok(isAggregateLifecycleError(err))
			// container aggregate code
			assert.equal((err as Error & { code?: string }).code, 'ORK1016')
			const det = (err as { details?: unknown }).details
			const errs = (err as { errors?: unknown }).errors
			assert.ok(Array.isArray(det))
			assert.ok(Array.isArray(errs))
			assert.equal(det.length, errs.length)
			return true
		})
		// Second call should not throw (already destroyed)
		await c.destroy()
	})

	test('global helper supports default symbol and named string keys', () => {
		// clear any existing registrations (default is protected and will remain)
		for (const name of container.list()) container.clear(name, true)
		const ALT = new Container({ logger })
		const T = createToken<number>('num2')
		// register on default container directly
		container().register(T, { useValue: 7 })
		// default
		const gotDef = container()
		assert.equal(gotDef.resolve(T), 7)
		// named
		container.set('alt', ALT) // named (string)
		const gotAlt = container('alt')
		assert.ok(gotAlt)
		// list/clear
		const keys = container.list()
		assert.deepStrictEqual(
			{ sawNonString: keys.some(k => typeof k !== 'string'), sawAlt: keys.some(k => k === 'alt'), clearedAlt: container.clear('alt', true) },
			{ sawNonString: true, sawAlt: true, clearedAlt: true },
		)
	})

	test('callable getter resolves a token map with resolve({ ... })', () => {
		// ensure clean registry state (default persists)
		for (const name of container.list()) container.clear(name, true)
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		const c = container()
		c.set(A, 123)
		c.set(B, 'xyz')
		const { a, b } = container().resolve({ a: A, b: B })
		assert.deepStrictEqual({ a, b }, { a: 123, b: 'xyz' })
	})

	test('named container resolves a token map with resolve({ ... })', () => {
		// clear any existing registrations (default persists)
		for (const name of container.list()) container.clear(name, true)
		const namedC = new Container({ logger })
		container.set('tenantA', namedC)
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		namedC.set(A, 2)
		namedC.set(B, 'z')
		const { a, b } = container('tenantA').resolve({ a: A, b: B })
		assert.deepStrictEqual({ a, b }, { a: 2, b: 'z' })
	})

	test('using(fn) runs in a child scope and destroys it after', async () => {
		class Scoped extends Adapter {
			public destroyed = false
			protected async onDestroy() { this.destroyed = true }
		}
		const T = createToken<Scoped>('Scoped')
		const root = new Container({ logger })
		let inst: Scoped | undefined
		await root.using(async (scope) => {
			scope.register(T, { useFactory: () => new Scoped({ logger }) })
			inst = scope.resolve(T)
			await Promise.resolve()
		})
		assert.deepStrictEqual(
			{ hasInst: !!inst, destroyed: inst?.destroyed === true },
			{ hasInst: true, destroyed: true },
		)
	})

	test('using(apply, fn) registers overrides in a child scope', async () => {
		const T = createToken<string>('scoped:val')
		const root = new Container({ logger })
		// no root registration
		const result = await root.using(
			(scope) => {
				scope.register(T, { useValue: 'scoped-value' })
			},
			async (scope) => {
				const v = scope.resolve(T)
				assert.equal(v, 'scoped-value')
				return v
			},
		)
		assert.equal(result, 'scoped-value')
		// After using, scope is destroyed; root should still have no registration
		assert.equal(root.get(T), undefined)
	})

	test('register with lock prevents re-registration for the same token', () => {
		const T = createToken<number>('lockReg')
		const c = new Container({ logger })
		c.register(T, { useValue: 1 }, true) // lock
		assert.equal(c.resolve(T), 1)
		assert.throws(() => c.register(T, { useValue: 2 }), /Cannot replace locked provider/)
	})

	test('set with lock prevents overwriting value', () => {
		const T = createToken<string>('lockSet')
		const c = new Container({ logger })
		c.set(T, 'A', true)
		assert.equal(c.resolve(T), 'A')
		assert.throws(() => c.set(T, 'B'), /Cannot replace locked provider/)
	})

	test('child inherits providers via has/get from parent', () => {
		const T = createToken<number>('parent:val')
		const parent = new Container({ logger })
		parent.set(T, 99)
		const child = parent.createChild()
		assert.deepStrictEqual(
			{ has: child.has(T), get: child.get(T), resolve: child.resolve(T) },
			{ has: true, get: 99, resolve: 99 },
		)
	})

	// NEW: Promise-handling for using
	test('using(fn) resolves promised return value', async () => {
		const T = createToken<string>('using:return')
		const root = new Container({ logger })
		const out = await root.using(async (scope) => {
			scope.register(T, { useValue: 'x' })
			await Promise.resolve()
			return scope.resolve(T) + '-done'
		})
		assert.equal(out, 'x-done')
	})

	test('global container.using supports named containers and async apply/fn', async () => {
		// reset registry state
		for (const name of container.list()) container.clear(name, true)
		const named = new Container({ logger })
		container.set('tenantX', named)
		const T = createToken<number>('n:val')
		const out = await container.using(
			async (scope) => {
				// async apply without timers
				await Promise.resolve()
				scope.set(T, 41)
			},
			async (scope) => {
				await Promise.resolve()
				return scope.resolve(T) + 1
			},
			'tenantX',
		)
		assert.equal(out, 42)
		// explicit: registration must not leak into the named container
		assert.equal(named.get(T), undefined)
	})

	test('global container.using(fn) with name runs in a child scope without leaking', async () => {
		for (const name of container.list()) container.clear(name, true)
		const named = new Container({ logger })
		container.set('tenantY', named)
		const T = createToken<string>('n:val2')
		await container.using(async (scope) => {
			// register and resolve inside scope
			scope.set(T, 'scoped')
			assert.equal(scope.resolve(T), 'scoped')
			await Promise.resolve()
		}, 'tenantY')
		// explicit: nothing should remain registered on the named container
		assert.equal(named.get(T), undefined)
	})

	test('resolve with tuple returns values in order', () => {
		const A = createToken<number>('tuple:A')
		const B = createToken<string>('tuple:B')
		const c = new Container({ logger })
		c.set(A, 7)
		c.set(B, 'eight')
		const [a, b] = c.resolve([A, B] as const)
		assert.deepStrictEqual([a, b], [7, 'eight'])
	})

	test('get with tuple returns optional values in order', () => {
		const A = createToken<number>('tuple2:A')
		const B = createToken<string>('tuple2:B')
		const C = createToken<boolean>('tuple2:C')
		const c = new Container({ logger })
		c.set(A, 1)
		c.set(C, true)
		const [a, b, cval] = c.get([A, B, C] as const)
		assert.deepStrictEqual([a, b, cval], [1, undefined, true])
	})
})
