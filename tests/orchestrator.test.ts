import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AggregateLifecycleError, Provider } from '@orkestrel/core'
import { Orchestrator, orchestrator, createToken, Container, Adapter, TimeoutError, register } from '@orkestrel/core'

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

class SlowStart extends Adapter {
	private readonly delayMs: number
	constructor(delayMs: number) {
		super()
		this.delayMs = delayMs
	}

	protected async onStart(): Promise<void> { await new Promise(r => setTimeout(r, this.delayMs)) }
}

class FailingStop extends Adapter {
	protected async onStop(): Promise<void> { throw new Error('stop-fail') }
}

class SlowStop extends Adapter {
	private readonly delayMs: number
	constructor(delayMs: number) {
		super()
		this.delayMs = delayMs
	}

	protected async onStop(): Promise<void> {
		await new Promise(r => setTimeout(r, this.delayMs))
	}
}

class Track extends Adapter {
	public started = false
	public stopped = false
	protected async onStart(): Promise<void> { this.started = true }
	protected async onStop(): Promise<void> { this.stopped = true }
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
	// clear any named registrations (default is protected and will remain)
	for (const name of orchestrator.list()) orchestrator.clear(name, true)
	// default
	const got = orchestrator()
	assert.ok(got instanceof Orchestrator)
	// named
	const other = new Orchestrator(new Container())
	orchestrator.set('other', other)
	assert.equal(orchestrator('other'), other)
	const names = orchestrator.list()
	assert.ok(names.some(k => typeof k !== 'string'))
	assert.ok(names.some((k: string | symbol) => k === 'other'))
	assert.equal(orchestrator.clear('other', true), true)
})

test('startAll rollback stops previously started components on failure', async () => {
	const A = createToken<Track>('A')
	const B = createToken<Track>('B')
	const X = createToken<FailingStartComponent>('X')
	const orch = new Orchestrator(new Container())
	const a = new Track()
	const b = new Track()
	orch.register(A, { useValue: a })
	orch.register(B, { useValue: b }, [A])
	orch.register(X, { useValue: new FailingStartComponent() }, [A])
	let err: unknown
	try {
		await orch.startAll()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	// both A and B should be stopped due to rollback
	assert.equal(a.started, true)
	assert.equal(b.started, true)
	assert.equal(a.stopped, true)
	assert.equal(b.stopped, true)
})

test('per-lifecycle onStart timeout triggers failure with telemetry', async () => {
	const SLOW = createToken<SlowStart>('SLOW')
	const orch = new Orchestrator(new Container())
	let err: unknown
	try {
		await orch.start([{ token: SLOW, provider: { useFactory: () => new SlowStart(30) }, dependencies: [], timeouts: { onStart: 10 } }])
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.match((err as Error).message, /Errors during startAll/)
	const details = (err as AggregateLifecycleError).details
	assert.ok(Array.isArray(details))
	assert.ok(details.some(d => d.tokenDescription === 'SLOW' && d.phase === 'start' && d.timedOut && Number.isFinite(d.durationMs)))
	// Also ensure TimeoutError is propagated in details
	assert.ok(details.some(d => d.error instanceof TimeoutError))
})

test('per-lifecycle onStop timeout triggers failure with telemetry', async () => {
	const SLOW_STOP = createToken<SlowStop>('SLOW_STOP')
	const orch = new Orchestrator(new Container())
	await orch.start([{ token: SLOW_STOP, provider: { useFactory: () => new SlowStop(30) }, dependencies: [], timeouts: { onStop: 10 } }])
	let err: unknown
	try {
		await orch.stopAll()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.match((err as Error).message, /Errors during stopAll/)
	const details = (err as AggregateLifecycleError).details
	assert.ok(Array.isArray(details))
	assert.ok(details.some(d => d.tokenDescription === 'SLOW_STOP' && d.phase === 'stop' && d.timedOut && Number.isFinite(d.durationMs)))
	assert.ok(details.some(d => d.error instanceof TimeoutError))
})

test('stopAll aggregates multiple stop failures', async () => {
	const F1 = createToken<FailingStop>('F1')
	const F2 = createToken<FailingStop>('F2')
	const orch = new Orchestrator(new Container())
	orch.register(F1, { useFactory: () => new FailingStop() })
	orch.register(F2, { useFactory: () => new FailingStop() })
	await orch.startAll()
	await assert.rejects(() => orch.stopAll(), /Errors during stopAll/)
})

test('async provider guard: useValue Promise throws at registration', () => {
	const T = createToken<Promise<number>>('AsyncVal')
	const orch = new Orchestrator(new Container())
	assert.throws(() => orch.register(T, { useValue: Promise.resolve(1) }), /Async providers are not supported/)
})

test('async provider guard: useFactory Promise throws at registration', () => {
	const T = createToken<number>('AsyncFactory')
	const orch = new Orchestrator(new Container())
	const prov = { useFactory: async () => 1 } as unknown as Provider<number>
	assert.throws(() => orch.register(T, prov), /Async providers are not supported/)
})

test('register helper wires dependencies correctly', async () => {
	class A extends Adapter {}
	class B extends Adapter {}
	const TA = createToken<A>('A')
	const TB = createToken<B>('B')
	const c = new Container()
	const app = new Orchestrator(c)
	await app.start([
		register(TA, { useFactory: () => new A() }),
		register(TB, { useFactory: () => new B() }, { dependencies: [TA] }),
	])
	// Ensure both are started and retrievable
	assert.ok(c.get(TA) instanceof A)
	assert.ok(c.get(TB) instanceof B)
	await app.stopAll()
	await app.destroyAll()
})

test('defaultTimeouts on orchestrator apply when register omits timeouts', async () => {
	class SlowS extends Adapter {
		protected async onStart() { /* fast */ }
		protected async onStop() {
			await new Promise<void>(r => setTimeout(r, 30))
		}
	}
	const T = createToken<SlowS>('SlowS')
	const app = new Orchestrator(new Container(), { defaultTimeouts: { onStop: 10 } })
	await app.start([register(T, { useFactory: () => new SlowS() })])
	let err: unknown
	try {
		await app.stopAll()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.match((err as Error).message, /Errors during stopAll/)
	const details = (err as AggregateLifecycleError).details
	assert.ok(Array.isArray(details))
	assert.ok(details.some(d => d.tokenDescription === 'SlowS' && d.phase === 'stop' && d.timedOut))
	assert.ok(details.some(d => d.error instanceof TimeoutError))
	// cleanup destroy to avoid dangling lifecycles
	await app.destroyAll().catch(() => {})
})

test('events callbacks are invoked for start/stop/destroy and errors', async () => {
	class Ok extends Adapter {
		protected async onStart() {}
		protected async onStop() {}
		protected async onDestroy() {}
	}
	class BadStop extends Adapter {
		protected async onStop() {
			throw new Error('nope')
		}
	}
	const TOK = createToken<Ok>('OK')
	const BAD = createToken<BadStop>('BAD')
	const events: { starts: string[], stops: string[], destroys: string[], errors: string[] } = { starts: [], stops: [], destroys: [], errors: [] }
	const app = new Orchestrator(new Container(), {
		events: {
			onComponentStart: ({ token }) => events.starts.push(token.description),
			onComponentStop: ({ token }) => events.stops.push(token.description),
			onComponentDestroy: ({ token }) => events.destroys.push(token.description),
			onComponentError: d => events.errors.push(`${d.tokenDescription}:${d.phase}`),
		},
	})
	await app.start([
		register(TOK, { useFactory: () => new Ok() }),
		register(BAD, { useFactory: () => new BadStop() }),
	])
	assert.ok(events.starts.includes('OK') && events.starts.includes('BAD'))
	let err: unknown
	try {
		await app.stopAll()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.ok(events.stops.includes('OK'))
	assert.ok(events.errors.some(e => e.startsWith('BAD:stop')))
	await app.destroyAll().catch(() => {})
	// destroy callbacks should include both
	assert.ok(events.destroys.includes('OK') && events.destroys.includes('BAD'))
})

test('register supports dependencies map and dedup/self-filter', async () => {
	class Cmp extends Adapter {
		public startedAt: number | null = null
		static counter = 0
		protected async onStart(): Promise<void> { this.startedAt = Cmp.counter++ }
	}
	const A = createToken<Cmp>('A')
	const B = createToken<Cmp>('B')
	const c = new Container()
	const app = new Orchestrator(c)
	await app.start([
		register(A, { useFactory: () => new Cmp() }),
		// B depends on A twice and itself once — helper should dedup and drop self
		register(B, { useFactory: () => new Cmp() }, { dependencies: { d1: A, d2: A, self: B } }),
	])
	const a = c.get(A) as Cmp
	const b = c.get(B) as Cmp
	assert.ok(a instanceof Cmp && b instanceof Cmp)
	// Ensure dependency ordering: A starts before B
	assert.ok((a.startedAt as number) < (b.startedAt as number))
	await app.stopAll()
	await app.destroyAll()
})

test('register options allow per-registration onStart timeout', async () => {
	const SLOW = createToken<SlowStart>('SLOW_REG')
	const orch = new Orchestrator(new Container())
	let err: unknown
	try {
		await orch.start([
			register(SLOW, { useFactory: () => new SlowStart(100) }, { timeouts: { onStart: 10 } }),
		])
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.match((err as Error).message, /Errors during startAll/)
})
