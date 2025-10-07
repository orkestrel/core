import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AggregateLifecycleError, Provider } from '@orkestrel/core'
import { Orchestrator, orchestrator, createToken, Container, Adapter, TimeoutError, register, tokenDescription, QueueAdapter } from '@orkestrel/core'

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

test('Orchestrator | starts components in topological order', async () => {
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
	await orch.start()
	assert.equal(a.startedAt, 0)
	assert.equal(b.startedAt, 1)
	assert.equal(c.startedAt, 2)
	await orch.stop()
	assert.ok((c.stoppedAt as number) < (b.stoppedAt as number))
	assert.ok((b.stoppedAt as number) < (a.stoppedAt as number))
})

test('Orchestrator | detects dependency cycles', async () => {
	TestComponent.counter = 0
	const A = createToken<TestComponent>('A')
	const B = createToken<TestComponent>('B')
	const a = new TestComponent('A')
	const b = new TestComponent('B')
	const orch = new Orchestrator(new Container())
	orch.register(A, { useValue: a }, [B])
	orch.register(B, { useValue: b }, [A])
	await assert.rejects(() => orch.start(), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Cycle detected/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1009]/)
		type WithDiag = Error & { code?: string, helpUrl?: string }
		const e2 = err as WithDiag
		assert.equal(e2.code, 'ORK1009')
		if (typeof e2.helpUrl === 'string') {
			assert.ok(e2.helpUrl.includes('/docs/overview.md'))
		}
		return true
	})
})

test('Orchestrator | aggregates start errors and rolls back started components', async () => {
	TestComponent.counter = 0
	const GOOD = createToken<TestComponent>('GOOD')
	const BAD = createToken<FailingStartComponent>('BAD')
	const good = new TestComponent('GOOD')
	const bad = new FailingStartComponent()
	const orch = new Orchestrator(new Container())
	orch.register(GOOD, { useValue: good })
	orch.register(BAD, { useValue: bad }, [GOOD])
	await assert.rejects(async () => orch.start(), /Errors during start/)
	assert.notEqual(good.startedAt, null)
})

test('Orchestrator | unknown dependency error contains context', async () => {
	const A = createToken<TestComponent>('A')
	const B = createToken<TestComponent>('B')
	const a = new TestComponent('A')
	const orch = new Orchestrator(new Container())
	orch.register(A, { useValue: a }, [B])
	await assert.rejects(() => orch.start(), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Unknown dependency B required by A/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1008]/)
		type WithDiag = Error & { code?: string }
		assert.equal((err as WithDiag).code, 'ORK1008')
		return true
	})
})

test('Orchestrator | destroy aggregates component and container errors', async () => {
	const BAD = createToken<FailingDestroyComponent>('BAD')
	const good = new TestComponent('GOOD')
	const GOOD = createToken<TestComponent>('GOOD')
	const orch = new Orchestrator(new Container())
	orch.register(GOOD, { useValue: good })
	orch.register(BAD, { useValue: new FailingDestroyComponent() })
	await orch.start()
	await orch.stop()
	await assert.rejects(() => orch.destroy(), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Errors during destroy/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1017]/)
		type WithDiag = Error & { code?: string }
		assert.equal((err as WithDiag).code, 'ORK1017')
		return true
	})
})

test('Orchestrator | global getter supports default symbol and named string keys', async () => {
	for (const name of orchestrator.list()) orchestrator.clear(name, true)
	const got = orchestrator()
	assert.ok(got instanceof Orchestrator)
	const other = new Orchestrator(new Container())
	orchestrator.set('other', other)
	assert.equal(orchestrator('other'), other)
	const names = orchestrator.list()
	assert.ok(names.some(k => typeof k !== 'string'))
	assert.ok(names.some((k: string | symbol) => k === 'other'))
	assert.equal(orchestrator.clear('other', true), true)
})

test('Orchestrator | start rollback stops previously started components on failure', async () => {
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
		await orch.start()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.equal(a.started, true)
	assert.equal(b.started, true)
	assert.equal(a.stopped, true)
	assert.equal(b.stopped, true)
})

test('Orchestrator | per-lifecycle onStart timeout triggers failure with telemetry', async () => {
	const SLOW = createToken<SlowStart>('SLOW')
	const orch = new Orchestrator(new Container())
	let err: unknown
	try {
		await orch.start([{ token: SLOW, provider: { useFactory: () => new SlowStart(30) }, dependencies: [], timeouts: { onStart: 10 } }])
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.match((err as Error).message, /Errors during start/)
	assert.match((err as Error).message, /\[Orkestrel]\[ORK1013]/)
	type WithDiag = Error & { code?: string }
	assert.equal((err as WithDiag).code, 'ORK1013')
	const details = (err as AggregateLifecycleError).details
	assert.ok(Array.isArray(details))
	assert.ok(details.some(d => d.tokenDescription === 'SLOW' && d.phase === 'start' && d.timedOut && Number.isFinite(d.durationMs)))
	assert.ok(details.some(d => d.error instanceof TimeoutError))
})

test('Orchestrator | per-lifecycle onStop timeout triggers failure with telemetry', async () => {
	const SLOW_STOP = createToken<SlowStop>('SLOW_STOP')
	const orch = new Orchestrator(new Container())
	await orch.start([{ token: SLOW_STOP, provider: { useFactory: () => new SlowStop(30) }, dependencies: [], timeouts: { onStop: 10 } }])
	let err: unknown
	try {
		await orch.stop()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.match((err as Error).message, /Errors during stop/)
	assert.match((err as Error).message, /\[Orkestrel]\[ORK1014]/)
	type WithDiag2 = Error & { code?: string }
	assert.equal((err as WithDiag2).code, 'ORK1014')
	const details = (err as AggregateLifecycleError).details
	assert.ok(Array.isArray(details))
	assert.ok(details.some(d => d.tokenDescription === 'SLOW_STOP' && d.phase === 'stop' && d.timedOut && Number.isFinite(d.durationMs)))
	assert.ok(details.some(d => d.error instanceof TimeoutError))
})

test('Orchestrator | stop aggregates multiple stop failures', async () => {
	const F1 = createToken<FailingStop>('F1')
	const F2 = createToken<FailingStop>('F2')
	const orch = new Orchestrator(new Container())
	orch.register(F1, { useFactory: () => new FailingStop() })
	orch.register(F2, { useFactory: () => new FailingStop() })
	await orch.start()
	await assert.rejects(() => orch.stop(), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Errors during stop/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1014]/)
		type WithDiag3 = Error & { code?: string }
		assert.equal((err as WithDiag3).code, 'ORK1014')
		return true
	})
})

test('Orchestrator | async provider guard: useValue Promise throws at registration', () => {
	const T = createToken<Promise<number>>('AsyncVal')
	const orch = new Orchestrator(new Container())
	assert.throws(() => orch.register(T, { useValue: Promise.resolve(1) }), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Async providers are not supported/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1010]/)
		type WithDiag4 = Error & { code?: string }
		assert.equal((err as WithDiag4).code, 'ORK1010')
		return true
	})
})

test('Orchestrator | async provider guard: useFactory Promise throws at registration', () => {
	const T = createToken<number>('AsyncFactory')
	const orch = new Orchestrator(new Container())
	const prov = { useFactory: async () => 1 } as unknown as Provider<number>
	assert.throws(() => orch.register(T, prov), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Async providers are not supported/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1011]/)
		type WithDiag5 = Error & { code?: string }
		assert.equal((err as WithDiag5).code, 'ORK1011')
		return true
	})
})

test('Orchestrator | register helper wires dependencies correctly', async () => {
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
	await app.destroy()
})

test('Orchestrator | defaultTimeouts on orchestrator apply when register omits timeouts', async () => {
	class SlowS extends Adapter {
		protected async onStart() { /* fast */ }
		protected async onStop() {
			await new Promise<void>(r => setTimeout(r, 30))
		}
	}
	const T = createToken<SlowS>('SlowS')
	const app = new Orchestrator(new Container(), { timeouts: { onStop: 10 } })
	await app.start([register(T, { useFactory: () => new SlowS() })])
	let err: unknown
	try {
		await app.stop()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.match((err as Error).message, /Errors during stop/)
	const details = (err as AggregateLifecycleError).details
	assert.ok(Array.isArray(details))
	assert.ok(details.some(d => d.tokenDescription === 'SlowS' && d.phase === 'stop' && d.timedOut))
	assert.ok(details.some(d => d.error instanceof TimeoutError))
	// cleanup destroy to avoid dangling lifecycles
	await app.destroy().catch(() => {})
})

test('Orchestrator | events callbacks are invoked for start/stop/destroy and errors', async () => {
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
			onComponentStart: ({ token }: { token: symbol, durationMs: number }) => events.starts.push(tokenDescription(token)),
			onComponentStop: ({ token }: { token: symbol, durationMs: number }) => events.stops.push(tokenDescription(token)),
			onComponentDestroy: ({ token }: { token: symbol, durationMs: number }) => events.destroys.push(tokenDescription(token)),
			onComponentError: (d: { tokenDescription: string, phase: 'start' | 'stop' | 'destroy' }) => events.errors.push(`${d.tokenDescription}:${d.phase}`),
		},
	})
	await app.start([
		register(TOK, { useFactory: () => new Ok() }),
		register(BAD, { useFactory: () => new BadStop() }),
	])
	assert.ok(events.starts.includes('OK') && events.starts.includes('BAD'))
	let err: unknown
	try {
		await app.stop()
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	assert.ok(events.stops.includes('OK'))
	assert.ok(events.errors.some(e => e.startsWith('BAD:stop')))
	await app.destroy().catch(() => {})
	// destroy callbacks should include both
	assert.ok(events.destroys.includes('OK') && events.destroys.includes('BAD'))
})

test('Orchestrator | register supports dependencies map and dedup/self-filter', async () => {
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
	await app.destroy()
})

test('Orchestrator | register options allow per-registration onStart timeout', async () => {
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
	assert.match((err as Error).message, /Errors during start/)
})

test('Orchestrator | destroy() stops then destroys in one pass', async () => {
	class T extends Adapter {
		public started = false
		public stopped = false
		protected async onStart() { this.started = true }
		protected async onStop() { this.stopped = true }
	}
	const A = createToken<T>('T:A')
	const B = createToken<T>('T:B')
	const c = new Container()
	const app = new Orchestrator(c)
	await app.start([
		register(A, { useFactory: () => new T() }),
		register(B, { useFactory: () => new T() }, { dependencies: [A] }),
	])
	const a = c.get(A) as T
	const b = c.get(B) as T
	assert.ok(a && b)
	assert.equal(a.started, true)
	assert.equal(b.started, true)
	await app.destroy()
	assert.equal(a.stopped, true)
	assert.equal(b.stopped, true)
	assert.equal(a.state, 'destroyed')
	assert.equal(b.state, 'destroyed')
})

test('Orchestrator | destroy() aggregates stop and destroy errors', async () => {
	class FailBoth extends Adapter {
		protected async onStop() { throw new Error('stop-bad') }
		protected async onDestroy() { throw new Error('destroy-bad') }
	}
	const FB = createToken<FailBoth>('FB')
	const app = new Orchestrator(new Container())
	await app.start([register(FB, { useFactory: () => new FailBoth() })])
	await assert.rejects(() => app.destroy(), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Errors during destroy/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1017]/)
		type WithDiag = Error & { code?: string }
		assert.equal((err as WithDiag).code, 'ORK1017')
		const details = (err as AggregateLifecycleError).details
		assert.ok(Array.isArray(details))
		// Should include both stop and destroy failures for the same token
		assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'stop'))
		assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'destroy'))
		return true
	})
})

test('Orchestrator | tracer emits layers and per-phase outcomes', async () => {
	class A extends Adapter {}
	class B extends Adapter {}
	const TA = createToken<A>('Tracer:A')
	const TB = createToken<B>('Tracer:B')
	const layersSeen: string[][][] = []
	const phases: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean }[] }[] = []
	const app = new Orchestrator(new Container(), {
		tracer: {
			onLayers: (payload: { layers: string[][] }) => { layersSeen.push(payload.layers) },
			onPhase: (payload: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean }[] }) => {
				phases.push({ phase: payload.phase, layer: payload.layer, outcomes: payload.outcomes.map(o => ({ token: o.token, ok: o.ok })) })
			},
		},
	})
	await app.start([
		register(TA, { useFactory: () => new A() }),
		register(TB, { useFactory: () => new B() }, { dependencies: [TA] }),
	])
	// layers should be emitted once
	assert.ok(layersSeen.length >= 1)
	assert.ok(layersSeen[0].some(layer => layer.includes('Tracer:A')))
	assert.ok(layersSeen[0].some(layer => layer.includes('Tracer:B')))
	// start phases should include both layers 0 and 1
	const startLayers = phases.filter(p => p.phase === 'start').map(p => p.layer)
	assert.ok(startLayers.includes(0) && startLayers.includes(1))
	// outcomes should mark ok
	assert.ok(phases.filter(p => p.phase === 'start').every(p => p.outcomes.every(o => o.ok)))
	await app.destroy()
	// during destroy, we should see stop and destroy phases as well
	const sawStop = phases.some(p => p.phase === 'stop')
	const sawDestroy = phases.some(p => p.phase === 'destroy')
	assert.ok(sawStop && sawDestroy)
})

// New: guard ensures no onPhase emission for empty-outcome layers
test('Orchestrator | tracer does not emit onPhase for layers with no outcomes', async () => {
	interface APort { a: true }
	interface BPort { b: true }
	const A = createToken<APort>('test:A')
	const B = createToken<BPort>('test:B')

	class BImpl extends Adapter implements BPort { b = true as const }

	const phases: Array<{ phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean, durationMs: number, timedOut?: boolean }[] }> = []

	const app = new Orchestrator(new Container(), {
		tracer: {
			onLayers: () => {},
			onPhase: (p: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: Array<{ token: string, ok: boolean, durationMs: number, timedOut?: boolean }> }) => phases.push(p),
		},
	})

	// Layer 0: A only (non-Lifecycle) -> no outcomes
	app.register(A, { useValue: { a: true } })
	// Layer 1: B depends on A (Lifecycle) -> outcomes present
	app.register(B, { useFactory: () => new BImpl() }, [A])

	await app.start()
	try {
		assert.equal(phases.length > 0, true)
		const startPhases = phases.filter(p => p.phase === 'start')
		// Should have only one start phase entry for layer 1 (layer 0 had no outcomes)
		assert.equal(startPhases.length, 1)
		assert.equal(startPhases[0]?.layer, 1)
		assert.equal(Array.isArray(startPhases[0]?.outcomes), true)
		assert.equal((startPhases[0]?.outcomes?.length ?? 0) > 0, true)
	}
	finally {
		await app.destroy()
	}
})

test('Orchestrator | per-layer concurrency limit caps start parallelism', async () => {
	class ConcurrencyProbe extends Adapter {
		static activeStart = 0; static peakStart = 0
		constructor(private readonly delayMs: number) { super() }
		protected async onStart() {
			ConcurrencyProbe.activeStart++
			ConcurrencyProbe.peakStart = Math.max(ConcurrencyProbe.peakStart, ConcurrencyProbe.activeStart)
			await new Promise(r => setTimeout(r, this.delayMs))
			ConcurrencyProbe.activeStart--
		}
	}
	ConcurrencyProbe.activeStart = 0
	ConcurrencyProbe.peakStart = 0
	const T1 = createToken<ConcurrencyProbe>('CC1')
	const T2 = createToken<ConcurrencyProbe>('CC2')
	const T3 = createToken<ConcurrencyProbe>('CC3')
	const T4 = createToken<ConcurrencyProbe>('CC4')
	const app = new Orchestrator(new Container(), { queue: new QueueAdapter({ concurrency: 2 }) })
	await app.start([
		register(T1, { useFactory: () => new ConcurrencyProbe(20) }),
		register(T2, { useFactory: () => new ConcurrencyProbe(20) }),
		register(T3, { useFactory: () => new ConcurrencyProbe(20) }),
		register(T4, { useFactory: () => new ConcurrencyProbe(20) }),
	])
	assert.ok(ConcurrencyProbe.peakStart <= 2)
	await app.destroy()
})

test('Orchestrator | per-layer concurrency limit caps stop and destroy parallelism', async () => {
	class ConcurrencyProbe extends Adapter {
		static activeStop = 0; static peakStop = 0
		static activeDestroy = 0; static peakDestroy = 0
		constructor(private readonly delayMs: number) { super() }
		protected async onStop() {
			ConcurrencyProbe.activeStop++
			ConcurrencyProbe.peakStop = Math.max(ConcurrencyProbe.peakStop, ConcurrencyProbe.activeStop)
			await new Promise(r => setTimeout(r, this.delayMs))
			ConcurrencyProbe.activeStop--
		}

		protected async onDestroy() {
			ConcurrencyProbe.activeDestroy++
			ConcurrencyProbe.peakDestroy = Math.max(ConcurrencyProbe.peakDestroy, ConcurrencyProbe.activeDestroy)
			await new Promise(r => setTimeout(r, this.delayMs))
			ConcurrencyProbe.activeDestroy--
		}
	}
	ConcurrencyProbe.activeStop = 0
	ConcurrencyProbe.peakStop = 0
	ConcurrencyProbe.activeDestroy = 0
	ConcurrencyProbe.peakDestroy = 0
	const T1 = createToken<ConcurrencyProbe>('CD1')
	const T2 = createToken<ConcurrencyProbe>('CD2')
	const T3 = createToken<ConcurrencyProbe>('CD3')
	const T4 = createToken<ConcurrencyProbe>('CD4')
	const app = new Orchestrator(new Container(), { queue: new QueueAdapter({ concurrency: 2 }) })
	await app.start([
		register(T1, { useFactory: () => new ConcurrencyProbe(20) }),
		register(T2, { useFactory: () => new ConcurrencyProbe(20) }),
		register(T3, { useFactory: () => new ConcurrencyProbe(20) }),
		register(T4, { useFactory: () => new ConcurrencyProbe(20) }),
	])
	await app.stop().catch(() => {})
	assert.ok(ConcurrencyProbe.peakStop <= 2)
	// restart to get to destroy phase (start components again then destroy)
	await app.start().catch(() => {})
	await app.destroy().catch(() => {})
	assert.ok(ConcurrencyProbe.peakDestroy <= 2)
})

// ---------------------------
// Property-based tests (random DAGs)
// ---------------------------

// Tiny seeded PRNG (LCG) for deterministic runs without deps
function makeRng(seed: number) {
	let s = seed >>> 0
	return {
		nextU32() {
			s = (s * 1664525 + 1013904223) >>> 0
			return s
		},
		next() { return (this.nextU32() & 0xffffffff) / 0x100000000 },
		rangeInt(min: number, max: number) { // inclusive min, inclusive max
			const r = this.next()
			return Math.floor(min + r * (max - min + 1))
		},
		chance(p: number) { return this.next() < p },
		shuffle<T>(arr: T[]): T[] {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = this.rangeInt(0, i)
				const t = arr[i]
				arr[i] = arr[j]
				arr[j] = t
			}
			return arr
		},
	}
}

// Build a random DAG with N nodes. We add edges i->j only for i<j to ensure acyclic.
function buildRandomDag(rng: ReturnType<typeof makeRng>) {
	const n = rng.rangeInt(3, 8)
	const nodes = Array.from({ length: n }, (_, i) => i)
	const edges: Array<[number, number]> = []
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			// Edge probability tuned to keep graphs moderately connected but quick
			if (rng.chance(0.3)) edges.push([i, j])
		}
	}
	// Shuffle a label mapping so the token names don't always align with indices
	const labels = rng.shuffle(nodes.slice())
	return { n, edges, labels }
}

// Simple component that records start/stop order
function makeRecorder() {
	let counter = 0
	class Recorder extends Adapter {
		public startedAt: number | null = null
		public stoppedAt: number | null = null
		protected async onStart(): Promise<void> { this.startedAt = counter++ }
		protected async onStop(): Promise<void> { this.stoppedAt = counter++ }
	}
	return { Recorder, getCounter: () => counter }
}

// Failing component for rollback scenarios
class FailingOnStart extends Adapter {
	protected async onStart(): Promise<void> {
		throw new Error('fail-start')
	}
}

function topoChecks(started: number[], stopped: number[], edges: Array<[number, number]>) {
	// For every edge u->v, started[u] < started[v]
	for (const [u, v] of edges) {
		assert.ok(started[u] < started[v], `start order violated for edge ${u}->${v}: ${started[u]} !< ${started[v]}`)
	}
	// For every edge u->v, stopped[v] < stopped[u] (reverse order)
	for (const [u, v] of edges) {
		assert.ok(stopped[v] < stopped[u], `stop order violated for edge ${u}->${v}: ${stopped[v]} !< ${stopped[u]}`)
	}
}

test('Orchestrator | random DAGs respect topological start/stop order', async () => {
	const seeds = [1, 2, 3, 123456, 987654321]
	for (const seed of seeds) {
		const rng = makeRng(seed)
		for (let iter = 0; iter < 5; iter++) {
			const { n, edges, labels } = buildRandomDag(rng)
			const { Recorder } = makeRecorder()
			const tokens = Array.from({ length: n }, (_, i) => createToken<InstanceType<typeof Recorder>>(`N${labels[i]}`))
			const instances = Array.from({ length: n }, () => new Recorder())
			const c = new Container()
			const app = new Orchestrator(c)
			// Register with dependencies derived from edges
			const depsFor = (idx: number) => edges.filter(([_, v]) => v === idx).map(([u]) => tokens[u])
			for (let i = 0; i < n; i++) app.register(tokens[i], { useValue: instances[i] }, depsFor(i))
			await app.start()
			const started = instances.map(x => x.startedAt as number)
			await app.stop()
			const stopped = instances.map(x => x.stoppedAt as number)
			topoChecks(started, stopped, edges)
			await app.destroy()
		}
	}
})

// On a failure during start, all previously started components must be stopped (rolled back)
test('Orchestrator | rollback stops all previously started components on failure', async () => {
	const rng = makeRng(42)
	for (let iter = 0; iter < 10; iter++) {
		const { n, edges } = buildRandomDag(rng)
		const { Recorder } = makeRecorder()
		const tokens = Array.from({ length: n }, (_, i) => createToken<Adapter>(`X${i}`))
		const instances: Adapter[] = Array.from({ length: n }, () => new Recorder())
		// Ensure at least one edge exists; if not, add a simple edge 0->1 when possible
		let edgeList: Array<[number, number]> = edges.slice()
		if (edgeList.length === 0) {
			if (n >= 2) edgeList = [[0, 1]]
			else continue // degenerate graph; skip iteration
		}
		// Pick a concrete edge and force the target node to fail on start
		const pick = rng.rangeInt(0, edgeList.length - 1)
		const chosen = edgeList[pick]
		if (!chosen) continue // safety guard
		const [_, v] = chosen
		instances[v] = new FailingOnStart()
		const c = new Container()
		const app = new Orchestrator(c)
		const depsFor = (idx: number) => edgeList.filter(([_, dst]) => dst === idx).map(([src]) => tokens[src])
		for (let i = 0; i < n; i++) app.register(tokens[i], { useValue: instances[i] }, depsFor(i))
		let err: unknown
		try {
			await app.start()
		}
		catch (e) { err = e }
		assert.ok(err instanceof Error, 'start should fail')
		// Every Recorder that started must have been stopped by rollback
		for (let i = 0; i < n; i++) {
			const inst = instances[i]
			if (inst instanceof Recorder) {
				const started = (inst.startedAt as number) ?? null
				if (started !== null) {
					assert.notEqual(inst.stoppedAt, null, `node ${i} started but was not stopped during rollback`)
				}
			}
		}
		// cleanup (no-op if destroy already happened)
		await app.destroy().catch(() => {})
	}
})

test('Orchestrator | register helper supports useClass with tuple inject', async () => {
	interface LPort { info(msg: string): void }
	const TLOG = createToken<LPort>('Reg:LOG')
	const TCFG = createToken<{ n: number }>('Reg:CFG')
	class L implements LPort { info(_m: string) {} }
	class WithDeps extends Adapter {
		constructor(public readonly l: LPort, public readonly cfg: { n: number }) { super() }
	}
	const c = new Container()
	const app = new Orchestrator(c)
	await app.start([
		register(TLOG, { useClass: L }),
		register(TCFG, { useValue: { n: 1 } }),
		register(createToken<WithDeps>('Reg:WITH'), { useClass: WithDeps, inject: [TLOG, TCFG] }, { dependencies: [TLOG, TCFG] }),
	])
	await app.destroy()
})

test('Orchestrator | start accepts direct useClass with tuple inject in registration object', async () => {
	interface LPort { info(msg: string): void }
	const TLOG = createToken<LPort>('Start:LOG')
	const TCFG = createToken<{ n: number }>('Start:CFG')
	class L implements LPort { info(_m: string) {} }
	class WithDeps extends Adapter {
		constructor(public readonly l: LPort, public readonly cfg: { n: number }) { super() }
	}
	const c = new Container()
	const app = new Orchestrator(c)
	await app.start([
		{ token: TLOG, provider: { useClass: L } },
		{ token: TCFG, provider: { useValue: { n: 2 } } },
		{ token: createToken<WithDeps>('Start:WITH'), provider: { useClass: WithDeps, inject: [TLOG, TCFG] }, dependencies: [TLOG, TCFG] },
	])
	await app.destroy()
})

test('Orchestrator | tracer start outcomes include failures', async () => {
	class Good extends Adapter { protected async onStart() {} }
	class Bad extends Adapter {
		protected async onStart() {
			throw new Error('fail-start')
		}
	}
	const TG = createToken<Good>('TraceFail:GOOD')
	const TB = createToken<Bad>('TraceFail:BAD')
	const phases: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean, timedOut?: boolean }[] }[] = []
	const app = new Orchestrator(new Container(), { tracer: { onLayers: () => {}, onPhase: p => phases.push(p) } })
	let err: unknown
	try {
		await app.start([
			register(TG, { useFactory: () => new Good() }),
			register(TB, { useFactory: () => new Bad() }, { dependencies: [TG] }),
		])
	}
	catch (e) { err = e }
	assert.ok(err instanceof Error)
	const startPhases = phases.filter(p => p.phase === 'start')
	assert.ok(startPhases.length >= 1)
	const allStartOutcomes = startPhases.flatMap(p => p.outcomes)
	assert.ok(allStartOutcomes.some(o => o.token === 'TraceFail:GOOD' && o.ok))
	assert.ok(allStartOutcomes.some(o => o.token === 'TraceFail:BAD' && !o.ok))
	await app.destroy().catch(() => {})
})

test('Orchestrator | events callbacks errors are isolated and do not disrupt orchestration', async () => {
	class Ok extends Adapter { protected async onStart() {} protected async onStop() {} }
	class BadStop extends Adapter {
		protected async onStart() {} protected async onStop() {
			throw new Error('bad-stop')
		}
	}
	const TOK = createToken<Ok>('EvtIso:OK')
	const TBAD = createToken<BadStop>('EvtIso:BADSTOP')
	const events = {
		onComponentStart: () => { throw new Error('listener-fail-start') },
		onComponentError: () => { throw new Error('listener-fail-error') },
	}
	const app = new Orchestrator(new Container(), { events })
	// Start should succeed despite onComponentStart throwing
	await app.start([
		register(TOK, { useFactory: () => new Ok() }),
		register(TBAD, { useFactory: () => new BadStop() }),
	])
	let stopErr: unknown
	try {
		await app.stop()
	}
	catch (e) { stopErr = e }
	assert.ok(stopErr instanceof Error)
	// Ensure the stop error is the orchestrator aggregate, not an event listener error masking it
	type WithDiag = Error & { code?: string }
	assert.equal((stopErr as WithDiag).code, 'ORK1014')
	await app.destroy().catch(() => {})
})

test('Orchestrator | duplicate registration for the same token throws ORK1007', async () => {
	class C extends Adapter {}
	const T = createToken<C>('dup')
	const orch = new Orchestrator(new Container())
	orch.register(T, { useFactory: () => new C() })
	assert.throws(() => orch.register(T, { useFactory: () => new C() }), (err: unknown) => {
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Duplicate registration/)
		assert.match((err as Error).message, /\[Orkestrel]\[ORK1007]/)
		return true
	})
})

test('Orchestrator | numeric defaultTimeouts apply to all phases', async () => {
	class SlowBoth extends Adapter {
		protected async onStart() { /* fast */ }
		protected async onStop() { await new Promise<void>(r => setTimeout(r, 15)) }
	}
	const T = createToken<SlowBoth>('NumDef:SlowBoth')
	const app = new Orchestrator(new Container(), { timeouts: 10 })
	await app.start([register(T, { useFactory: () => new SlowBoth() })])
	let stopErr: unknown
	try {
		await app.stop()
	}
	catch (e) {
		stopErr = e
	}
	assert.ok(stopErr instanceof Error)
	const det = (stopErr as AggregateLifecycleError).details
	assert.ok(Array.isArray(det))
	assert.ok(det.some(d => d.tokenDescription === 'NumDef:SlowBoth' && d.timedOut && d.phase === 'stop'))
	await app.destroy().catch(() => {})
})
