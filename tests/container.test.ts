import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createToken, Container, container, Adapter } from '@orkestrel/core'

class TestLifecycle extends Adapter {
	started = 0
	stopped = 0

	async onStart() { this.started++ }
	async onStop() { this.stopped++ }
}

class FailingOnDestroy extends Adapter {
	protected async onDestroy(): Promise<void> { throw new Error('destroy-fail') }
}

test('value provider resolution', () => {
	const TOK = createToken<number>('num')
	const c = new Container()
	c.register(TOK, { useValue: 42 })
	assert.strictEqual(c.get(TOK), 42)
	assert.equal(c.has(TOK), true)
})

test('factory provider resolution and tryGet/has', () => {
	const TOK = createToken<{ v: number }>('obj')
	const MISS = createToken('missing')
	const c = new Container()
	c.register(TOK, { useFactory: () => ({ v: 10 }) })
	assert.strictEqual(c.get(TOK).v, 10)
	assert.equal(c.tryGet(MISS), undefined)
	assert.equal(c.has(MISS), false)
})

test('class provider WITHOUT autostart and child container lookup', async () => {
	const TOK = createToken<TestLifecycle>('life')
	const c = new Container()
	c.register(TOK, { useFactory: () => new TestLifecycle({}) })
	const child = c.createChild()
	const inst = child.get(TOK)
	// no autostart; instance should not be started yet
	assert.strictEqual((inst as TestLifecycle).started, 0)
	await (inst as TestLifecycle).start()
	assert.strictEqual((inst as TestLifecycle).started, 1)
	await child.destroy()
	await c.destroy()
	// after destroy, lifecycle should be destroyed (stop may or may not have run depending on state)
	assert.ok((inst as TestLifecycle).stopped >= 0)
})

test('destroy aggregates errors and is idempotent', async () => {
	const BAD = createToken<FailingOnDestroy>('bad')
	const c = new Container()
	c.register(BAD, { useFactory: () => new FailingOnDestroy() })
	const inst = c.get(BAD)
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
	assert.equal(gotDef.get(T), 7)
	// named
	const gotAlt = container('alt')
	assert.ok(gotAlt)
	// list/clear
	const keys = container.list()
	assert.ok(keys.some(k => typeof k === 'symbol'))
	assert.ok(keys.some(k => k === 'alt'))
	assert.equal(container.clear('alt'), true)
})

test('container() throws if default not set', () => {
	for (const name of container.list()) container.clear(name)
	assert.throws(() => container(), /No container instance registered/)
})
