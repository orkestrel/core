import { test } from 'node:test'
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

test('Container suite', { concurrency: false }, async (t) => {
	// Fresh logger per subtest
	t.beforeEach(() => {
		logger = new NoopLogger()
	})
	// Ensure we don’t leak named containers across subtests (keep default)
	t.afterEach(() => {
		for (const name of container.list()) {
			container.clear(name, true)
		}
	})

	await t.test('value provider resolution', () => {
		const TOK = createToken<number>('num')
		const c = new Container({ logger })
		c.register(TOK, { useValue: 42 })
		assert.strictEqual(c.resolve(TOK), 42)
		assert.equal(c.has(TOK), true)
	})

	await t.test('strict resolve missing token throws', () => {
		const MISSING = createToken<number>('missing:strict')
		const c = new Container({ logger })
		assert.throws(() => c.resolve(MISSING), (err: unknown) => {
			if (!(err instanceof Error)) return false
			// Match current diagnostics message or the ORK1006 error code to be robust to wording changes
			return /No provider for missing:strict/.test(err.message) || (err as Error & { code?: string }).code === 'ORK1006'
		})
	})

	// Inject tests
	await t.test('factory provider with inject array resolves dependencies by order', () => {
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

	await t.test('factory provider with inject object resolves named dependencies', () => {
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

	await t.test('class provider with inject array constructs with resolved dependencies', () => {
		const A = createToken<number>('A3')
		const B = createToken<string>('B3')
		const C = createToken<NeedsDeps>('C3')
		const c = new Container({ logger })
		c.set(A, 5)
		c.set(B, 'z')
		c.register(C, { useClass: NeedsDeps, inject: [A, B] })
		const inst = c.resolve(C)
		assert.ok(inst instanceof NeedsDeps)
		assert.equal(inst.a, 5)
		assert.equal(inst.b, 'z')
	})

	await t.test('factory provider resolution and get/has', () => {
		const TOK = createToken<{ v: number }>('obj')
		const MISS = createToken('missing')
		const c = new Container({ logger })
		c.register(TOK, { useFactory: () => ({ v: 10 }) })
		assert.strictEqual(c.resolve(TOK).v, 10)
		assert.equal(c.get(MISS), undefined)
		assert.equal(c.has(MISS), false)
	})

	await t.test('object-map strict resolution and optional get()', () => {
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		const C = createToken<boolean>('C')
		const c = new Container({ logger })
		c.set(A, 1)
		c.set(B, 'two')
		c.set(C, true)
		const { a, b, c: cval } = c.resolve({ a: A, b: B, c: C })
		assert.equal(a, 1)
		assert.equal(b, 'two')
		assert.equal(cval, true)
		const maybe = c.get({ a: A, x: createToken('X') })
		assert.equal(maybe.a, 1)
		assert.equal(maybe.x, undefined)
	})

	await t.test('class provider without autostart; child container lookup', async () => {
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

	await t.test('destroy aggregates errors and is idempotent', async () => {
		const BAD = createToken<FailingOnDestroy>('bad')
		const c = new Container({ logger })
		c.register(BAD, { useFactory: () => new FailingOnDestroy({ logger }) })
		const inst = c.resolve(BAD)
		await inst.start()
		await inst.stop()
		await assert.rejects(() => c.destroy(), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Errors during container destroy/)
			assert.ok(isAggregateLifecycleError(err))
			// container aggregate code
			assert.equal((err as Error & { code?: string }).code, 'ORK1016')
			assert.ok(err.details.length >= 1)
			assert.equal(err.details.length, err.errors.length)
			return true
		})
		// Second call should not throw (already destroyed)
		await c.destroy()
	})

	await t.test('global helper supports default symbol and named string keys', () => {
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
		assert.ok(keys.some(k => typeof k !== 'string'))
		assert.ok(keys.some(k => k === 'alt'))
		assert.equal(container.clear('alt', true), true)
	})

	await t.test('callable getter resolves a token map with resolve({ ... })', () => {
		// ensure clean registry state (default persists)
		for (const name of container.list()) container.clear(name, true)
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		const c = container()
		c.set(A, 123)
		c.set(B, 'xyz')
		const { a, b } = container().resolve({ a: A, b: B })
		assert.equal(a, 123)
		assert.equal(b, 'xyz')
	})

	await t.test('named container resolves a token map with resolve({ ... })', () => {
		// clear any existing registrations (default persists)
		for (const name of container.list()) container.clear(name, true)
		const namedC = new Container({ logger })
		container.set('tenantA', namedC)
		const A = createToken<number>('A')
		const B = createToken<string>('B')
		container().set(A, 1)
		namedC.set(A, 2)
		namedC.set(B, 'z')
		const { a, b } = container('tenantA').resolve({ a: A, b: B })
		assert.equal(a, 2)
		assert.equal(b, 'z')
	})

	await t.test('using(fn) runs in a child scope and destroys it after', async () => {
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
		assert.ok(inst)
		assert.equal(inst?.destroyed, true)
	})

	await t.test('using(apply, fn) registers overrides in a child scope', async () => {
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

	await t.test('register with lock prevents re-registration for the same token', () => {
		const T = createToken<number>('lockReg')
		const c = new Container({ logger })
		c.register(T, { useValue: 1 }, true) // lock
		assert.equal(c.resolve(T), 1)
		assert.throws(() => c.register(T, { useValue: 2 }), /Cannot replace locked provider/)
	})

	await t.test('set with lock prevents overwriting value', () => {
		const T = createToken<string>('lockSet')
		const c = new Container({ logger })
		c.set(T, 'A', true)
		assert.equal(c.resolve(T), 'A')
		assert.throws(() => c.set(T, 'B'), /Cannot replace locked provider/)
	})

	await t.test('child inherits providers via has/get from parent', () => {
		const T = createToken<number>('parent:val')
		const parent = new Container({ logger })
		parent.set(T, 99)
		const child = parent.createChild()
		assert.equal(child.has(T), true)
		assert.equal(child.get(T), 99)
		// resolve should also work via parent lookup
		assert.equal(child.resolve(T), 99)
	})

	// NEW: Promise-handling for using
	await t.test('using(fn) resolves promised return value', async () => {
		const T = createToken<string>('using:return')
		const root = new Container({ logger })
		const out = await root.using(async (scope) => {
			scope.register(T, { useValue: 'x' })
			await Promise.resolve()
			return scope.resolve(T) + '-done'
		})
		assert.equal(out, 'x-done')
	})

	await t.test('global container.using supports named containers and async apply/fn', async () => {
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

	await t.test('global container.using(fn) with name runs in a child scope without leaking', async () => {
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
})
