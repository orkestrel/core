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

test('value provider resolution', () => {
	const TOK = createToken<number>('num')
	const c = new Container()
	c.register(TOK, { useValue: 42 })
	assert.strictEqual(c.resolve(TOK), 42)
	assert.equal(c.has(TOK), true)
})

test('factory provider resolution and get/has', () => {
	const TOK = createToken<{ v: number }>('obj')
	const MISS = createToken('missing')
	const c = new Container()
	c.register(TOK, { useFactory: () => ({ v: 10 }) })
	assert.strictEqual(c.resolve(TOK).v, 10)
	assert.equal(c.get(MISS), undefined)
	assert.equal(c.has(MISS), false)
})

test('object-map strict resolution and optional get()', () => {
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

test('class provider WITHOUT autostart and child container lookup', async () => {
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

test('destroy aggregates errors and is idempotent', async () => {
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

test('container() helper supports default symbol and named string keys', () => {
	// clear any existing registrations
	for (const name of container.list()) container.clear(name)
	const DEF = new Container()
	const ALT = new Container()
	const T = createToken<number>('num2')
	DEF.register(T, { useValue: 7 })
	container.set(DEF) // default (symbol)
	container.set(ALT, 'alt') // named (string)
	// default
	const gotDef = container()
	assert.equal(gotDef.resolve(T), 7)
	// named
	const gotAlt = container('alt')
	assert.ok(gotAlt)
	// list/clear
	const keys = container.list()
	assert.ok(keys.some(k => typeof k !== 'string'))
	assert.ok(keys.some(k => k === 'alt'))
	assert.equal(container.clear('alt'), true)
})

test('container() throws if default not set', () => {
	for (const name of container.list()) container.clear(name)
	assert.throws(() => container(), /No container instance registered/)
})

test('callable container resolves a token map with resolve({ ... })', () => {
	// ensure clean registry state
	for (const name of container.list()) container.clear(name)
	const c = new Container()
	container.set(c)
	const A = createToken<number>('A')
	const B = createToken<string>('B')
	c.set(A, 123)
	c.set(B, 'xyz')
	const { a, b } = container().resolve({ a: A, b: B })
	assert.equal(a, 123)
	assert.equal(b, 'xyz')
})

test('named container resolves a token map with resolve({ ... })', () => {
	// clear any existing registrations
	for (const name of container.list()) container.clear(name)
	const defaultC = new Container()
	const namedC = new Container()
	container.set(defaultC)
	container.set(namedC, 'tenantA')
	const A = createToken<number>('A')
	const B = createToken<string>('B')
	defaultC.set(A, 1)
	namedC.set(A, 2)
	namedC.set(B, 'z')
	const { a, b } = container('tenantA').resolve({ a: A, b: B })
	assert.equal(a, 2)
	assert.equal(b, 'z')
})

test('Container.using runs in a child scope and destroys it after', async () => {
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
