import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Orchestrator, orchestrator, createToken, Container, Adapter } from '@orkestrel/core'

class TestComponent extends Adapter {
	public readonly name: string
	public startedAt: number | null = null
	public stoppedAt: number | null = null
	static counter = 0
	constructor(name: string) {
		super()
		this.name = name
	}

	protected async onStart(): Promise<void> {
		this.startedAt = TestComponent.counter++
	}

	protected async onStop(): Promise<void> {
		this.stoppedAt = TestComponent.counter++
	}
}

class FailingStartComponent extends Adapter {
	protected async onStart(): Promise<void> {
		throw new Error('boom')
	}
}
class FailingDestroyComponent extends Adapter {
	protected async onDestroy(): Promise<void> {
		throw new Error('bye')
	}
}

test('orchestrator starts components in topological order', async () => {
	TestComponent.counter = 0
	const A = createToken<TestComponent>('A')
	const B = createToken<TestComponent>('B')
	const C = createToken<TestComponent>('C')
	const a = new TestComponent('A')
	const b = new TestComponent('B')
	const c = new TestComponent('C')
	const orch = new Orchestrator(new Container())
	orch.register(A, { useValue: a })
	orch.register(B, { useValue: b }, [A])
	orch.register(C, { useValue: c }, [B])
	await orch.startAll()
	assert.equal(a.startedAt, 0)
	assert.equal(b.startedAt, 1)
	assert.equal(c.startedAt, 2)
	await orch.stopAll()
	assert.ok((c.stoppedAt as number) < (b.stoppedAt as number))
	assert.ok((b.stoppedAt as number) < (a.stoppedAt as number))
})

test('orchestrator detects cycles', () => {
	TestComponent.counter = 0
	const A = createToken<TestComponent>('A')
	const B = createToken<TestComponent>('B')
	const a = new TestComponent('A')
	const b = new TestComponent('B')
	const orch = new Orchestrator(new Container())
	orch.register(A, { useValue: a }, [B])
	orch.register(B, { useValue: b }, [A])
	return assert.rejects(() => orch.startAll(), /Cycle detected/)
})

test('orchestrator aggregates start errors', async () => {
	TestComponent.counter = 0
	const GOOD = createToken<TestComponent>('GOOD')
	const BAD = createToken<FailingStartComponent>('BAD')
	const good = new TestComponent('GOOD')
	const bad = new FailingStartComponent()
	const orch = new Orchestrator(new Container())
	orch.register(GOOD, { useValue: good })
	orch.register(BAD, { useValue: bad }, [GOOD])
	await assert.rejects(async () => orch.startAll(), /Errors during startAll/)
	assert.notEqual(good.startedAt, null)
})

test('unknown dependency throws with context', async () => {
	const A = createToken<TestComponent>('A')
	const B = createToken<TestComponent>('B')
	const a = new TestComponent('A')
	const orch = new Orchestrator(new Container())
	orch.register(A, { useValue: a }, [B])
	await assert.rejects(() => orch.startAll(), /Unknown dependency B required by A/)
})

test('destroyAll aggregates errors from components and container', async () => {
	const BAD = createToken<FailingDestroyComponent>('BAD')
	const good = new TestComponent('GOOD')
	const GOOD = createToken<TestComponent>('GOOD')
	const orch = new Orchestrator(new Container())
	orch.register(GOOD, { useValue: good })
	orch.register(BAD, { useValue: new FailingDestroyComponent() })
	await orch.startAll()
	await orch.stopAll()
	await assert.rejects(() => orch.destroyAll(), /Errors during destroyAll/)
})

test('orchestrator() helper supports default symbol and named string keys', async () => {
	// clear any existing registrations
	for (const name of orchestrator.list()) orchestrator.clear(name)
	const c = new Container()
	const orch = new Orchestrator(c)
	orchestrator.set(orch) // default
	const got = orchestrator()
	assert.equal(got, orch)
	const other = new Orchestrator(new Container())
	orchestrator.set(other, 'other')
	assert.equal(orchestrator('other'), other)
	const names = orchestrator.list()
	assert.ok(names.some((k: string | symbol) => typeof k === 'symbol'))
	assert.ok(names.some((k: string | symbol) => k === 'other'))
	assert.equal(orchestrator.clear('other'), true)
})

test('orchestrator() throws if default not set', () => {
	for (const name of orchestrator.list()) orchestrator.clear(name)
	assert.throws(() => orchestrator(), /No orchestrator instance registered/)
})
