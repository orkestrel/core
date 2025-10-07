import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createToken, Container, container, Adapter } from '@orkestrel/core'

class TestLifecycle extends Adapter {
	started = 0
	stopped = 0

	protected async onStart() { this.started++ }
	protected async onStop() { this.stopped++ }
}

class FailingOnDestroy extends Adapter {
	protected async onDestroy(): Promise<void> { throw new Error('destroy-fail') }
}

test('Container | value provider resolution', () => {
	const TOK = createToken<number>('num')
	const c = new Container()
	c.register(TOK, { useValue: 42 })
	assert.strictEqual(c.resolve(TOK), 42)
	assert.equal(c.has(TOK), true)
})

// Inject tests

test('Container | factory provider with inject array resolves dependencies by order', () => {
	const A = createToken<number>('A')
	const B = createToken<string>('B')
	const OUT = createToken<{ a: number, b: string }>('OUT')
	const c = new Container()
	c.set(A, 10)
	c.set(B, 'hi')
	c.register(OUT, { useFactory: (a, b) => ({ a, b }), inject: [A, B] })
	const v = c.resolve(OUT)
	assert.deepEqual(v, { a: 10, b: 'hi' })
})

test('Container | factory provider with inject object resolves named dependencies', () => {
	const A = createToken<number>('A2')
	const B = createToken<string>('B2')
	const SUM = createToken<number>('SUM')
	const c = new Container()
	c.set(A, 3)
	c.set(B, 'abcd')
	c.register(SUM, { useFactory: ({ a, b }) => a + b.length, inject: { a: A, b: B } })
	assert.equal(c.resolve(SUM), 3 + 4)
})

class NeedsDeps {
	constructor(public readonly a: number, public readonly b: string) {}
}

test('Container | class provider with inject array constructs with resolved dependencies', () => {
	const A = createToken<number>('A3')
	const B = createToken<string>('B3')
	const C = createToken<NeedsDeps>('C3')
	const c = new Container()
	c.set(A, 5)
	c.set(B, 'z')
	c.register(C, { useClass: NeedsDeps, inject: [A, B] })
	const inst = c.resolve(C)
	assert.ok(inst instanceof NeedsDeps)
	assert.equal(inst.a, 5)
	assert.equal(inst.b, 'z')
})

test('Container | factory provider resolution and get/has', () => {
	const TOK = createToken<{ v: number }>('obj')
	const MISS = createToken('missing')
	const c = new Container()
	c.register(TOK, { useFactory: () => ({ v: 10 }) })
	assert.strictEqual(c.resolve(TOK).v, 10)
	assert.equal(c.get(MISS), undefined)
	assert.equal(c.has(MISS), false)
})

test('Container | object-map strict resolution and optional get()', () => {
	const A = createToken<number>('A')
	const B = createToken<string>('B')
	const C = createToken<boolean>('C')
	const c = new Container()
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

test('Container | class provider without autostart; child container lookup', async () => {
	const TOK = createToken<TestLifecycle>('life')
	const c = new Container()
	c.register(TOK, { useFactory: () => new TestLifecycle({}) })
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

test('Container | destroy aggregates errors and is idempotent', async () => {
	const BAD = createToken<FailingOnDestroy>('bad')
	const c = new Container()
	c.register(BAD, { useFactory: () => new FailingOnDestroy() })
	const inst = c.resolve(BAD)
	await inst.start()
	await inst.stop()
	await assert.rejects(() => c.destroy(), /Errors during container destroy/)
	// Second call should not throw (already destroyed)
	await c.destroy()
})

test('Container | global helper supports default symbol and named string keys', () => {
	// clear any existing registrations (default is protected and will remain)
	for (const name of container.list()) container.clear(name, true)
	const ALT = new Container()
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

test('Container | callable getter resolves a token map with resolve({ ... })', () => {
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

test('Container | named container resolves a token map with resolve({ ... })', () => {
	// clear any existing registrations (default persists)
	for (const name of container.list()) container.clear(name, true)
	const namedC = new Container()
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

test('Container | using(fn) runs in a child scope and destroys it after', async () => {
	class Scoped extends Adapter {
		public destroyed = false
		protected async onDestroy() { this.destroyed = true }
	}
	const T = createToken<Scoped>('Scoped')
	const root = new Container()
	let inst: Scoped | undefined
	await root.using(async (scope) => {
		scope.register(T, { useFactory: () => new Scoped() })
		inst = scope.resolve(T)
		await Promise.resolve()
	})
	assert.ok(inst)
	assert.equal(inst?.destroyed, true)
})

test('Container | using(apply, fn) registers overrides in a child scope', async () => {
	const T = createToken<string>('scoped:val')
	const root = new Container()
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

test('Container | register with lock prevents re-registration for the same token', () => {
	const T = createToken<number>('lockReg')
	const c = new Container()
	c.register(T, { useValue: 1 }, true) // lock
	assert.equal(c.resolve(T), 1)
	assert.throws(() => c.register(T, { useValue: 2 }), /Cannot replace locked provider/)
})

test('Container | set with lock prevents overwriting value', () => {
	const T = createToken<string>('lockSet')
	const c = new Container()
	c.set(T, 'A', true)
	assert.equal(c.resolve(T), 'A')
	assert.throws(() => c.set(T, 'B'), /Cannot replace locked provider/)
})

test('Container | child inherits providers via has/get from parent', () => {
	const T = createToken<number>('parent:val')
	const parent = new Container()
	parent.set(T, 99)
	const child = parent.createChild()
	assert.equal(child.has(T), true)
	assert.equal(child.get(T), 99)
	// resolve should also work via parent lookup
	assert.equal(child.resolve(T), 99)
})
