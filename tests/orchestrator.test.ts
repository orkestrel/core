import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Provider } from '@orkestrel/core'
import { NoopLogger,
	Orchestrator, orchestrator, createToken, Container, Adapter, register, tokenDescription, QueueAdapter,
	isAggregateLifecycleError, isLifecycleErrorDetail,
} from '@orkestrel/core'

let logger: NoopLogger

class TestComponent extends Adapter {
	public readonly name: string
	public startedAt: number | null = null
	public stoppedAt: number | null = null
	static counter = 0
	constructor(name: string) {
		super({ logger })
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
		super({ logger })
		this.delayMs = delayMs
	}

	protected async onStart(): Promise<void> {
		await new Promise(r => setTimeout(r, this.delayMs))
	}
}

class FailingStopDestroyComponent extends Adapter {
	protected async onStop() {
		throw new Error('stop-bad')
	}

	protected async onDestroy() {
		throw new Error('destroy-bad')
	}
}

class SlowStop extends Adapter {
	private readonly delayMs: number
	constructor(delayMs: number) {
		super({ logger })
		this.delayMs = delayMs
	}

	protected async onStop(): Promise<void> {
		await new Promise(r => setTimeout(r, this.delayMs))
	}
}

class Track extends Adapter {
	public started = false
	public stopped = false
	protected async onStart(): Promise<void> {
		this.started = true
	}

	protected async onStop(): Promise<void> {
		this.stopped = true
	}
}

// Tiny seeded PRNG (LCG) for deterministic runs without deps
function makeRng(seed: number) {
	let s = seed >>> 0
	return {
		nextU32() {
			s = (s * 1664525 + 1013904223) >>> 0
			return s
		},
		next() { return (this.nextU32() & 0xffffffff) / 0x100000000 },
		rangeInt(min: number, max: number) {
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
			if (rng.chance(0.3)) edges.push([i, j])
		}
	}
	const labels = rng.shuffle(nodes.slice())
	return { n, edges, labels }
}

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

class FailingOnStart extends Adapter {
	protected async onStart(): Promise<void> {
		throw new Error('fail-start')
	}
}

type HasOrder = { startedAt: number | null, stoppedAt: number | null }
function hasOrder(x: unknown): x is HasOrder {
	return typeof x === 'object' && x !== null && 'startedAt' in x && 'stoppedAt' in x
}

test('Orchestrator suite', { concurrency: false }, async (t) => {
	t.beforeEach(() => {
		logger = new NoopLogger()
		for (const name of orchestrator.list()) {
			orchestrator.clear(name, true)
		}
	})
	t.afterEach(() => {
		for (const name of orchestrator.list()) {
			orchestrator.clear(name, true)
		}
	})

	await t.test('starts components in topological order', async () => {
		TestComponent.counter = 0
		const A = createToken<TestComponent>('A')
		const B = createToken<TestComponent>('B')
		const C = createToken<TestComponent>('C')
		const a = new TestComponent('A')
		const b = new TestComponent('B')
		const c = new TestComponent('C')
		const orch = new Orchestrator(new Container({ logger }), { logger })
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

	await t.test('detects dependency cycles', async () => {
		TestComponent.counter = 0
		const A = createToken<TestComponent>('A')
		const B = createToken<TestComponent>('B')
		const a = new TestComponent('A')
		const b = new TestComponent('B')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register(A, { useValue: a }, [B])
		orch.register(B, { useValue: b }, [A])
		await assert.rejects(() => orch.start(), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Cycle detected/)
			// removed formatted prefix assertion; formatting is handled by DiagnosticAdapter at emission time
			type WithDiag = Error & { code?: string, helpUrl?: string }
			const e2 = err as WithDiag
			assert.equal(e2.code, 'ORK1009')
			if (typeof e2.helpUrl === 'string') {
				assert.ok(e2.helpUrl.includes('/docs/api/index.html'), `helpUrl should include '/docs/api/index.html'; actual: ${e2.helpUrl}`)
			}
			return true
		})
	})

	await t.test('aggregates start errors and rolls back started components', async () => {
		TestComponent.counter = 0
		const GOOD = createToken<TestComponent>('GOOD')
		const BAD = createToken<FailingStartComponent>('BAD')
		const good = new TestComponent('GOOD')
		const bad = new FailingStartComponent({ logger })
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register(GOOD, { useValue: good })
		orch.register(BAD, { useValue: bad }, [GOOD])
		await assert.rejects(async () => orch.start(), (err: unknown) => {
			// verify aggregate code and that details include ORK1022 for the failing start
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated start error details')
			}
			return true
		})
		assert.notEqual(good.startedAt, null)
		await orch.destroy().catch(() => {})
	})

	await t.test('unknown dependency error contains context', async () => {
		const A = createToken<TestComponent>('A')
		const B = createToken<TestComponent>('B')
		const a = new TestComponent('A')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register(A, { useValue: a }, [B])
		await assert.rejects(() => orch.start(), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Unknown dependency B required by A/)
			// removed formatted prefix assertion
			type WithDiag = Error & { code?: string }
			assert.equal((err as WithDiag).code, 'ORK1008')
			return true
		})
	})

	await t.test('destroy aggregates component and container errors', async () => {
		const BAD = createToken<FailingDestroyComponent>('BAD')
		const good = new TestComponent('GOOD')
		const GOOD = createToken<TestComponent>('GOOD')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register(GOOD, { useValue: good })
		orch.register(BAD, { useValue: new FailingDestroyComponent({ logger }) })
		await orch.start()
		await orch.stop()
		await assert.rejects(() => orch.destroy(), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Errors during destroy/)
			// removed formatted prefix assertion
			type WithDiag = Error & { code?: string }
			assert.equal((err as WithDiag).code, 'ORK1017')
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated destroy error details')
			}
			return true
		})
	})

	await t.test('global getter supports default symbol and named string keys', async () => {
		for (const name of orchestrator.list()) {
			orchestrator.clear(name, true)
		}
		const got = orchestrator()
		assert.ok(got instanceof Orchestrator)
		const other = new Orchestrator(new Container({ logger }), { logger })
		orchestrator.set('other', other)
		assert.equal(orchestrator('other'), other)
		const names = orchestrator.list()
		assert.ok(names.some(k => typeof k !== 'string'))
		assert.ok(names.some((k: string | symbol) => k === 'other'))
		assert.equal(orchestrator.clear('other', true), true)
	})

	await t.test('start rollback stops previously started components on failure', async () => {
		const A = createToken<Track>('A')
		const B = createToken<Track>('B')
		const X = createToken<FailingStartComponent>('X')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		const a = new Track({ logger })
		const b = new Track({ logger })
		orch.register(A, { useValue: a })
		orch.register(B, { useValue: b }, [A])
		orch.register(X, { useValue: new FailingStartComponent({ logger }) }, [A])
		let err: unknown
		try {
			await orch.start()
		}
		catch (e) {
			err = e
		}
		assert.ok(err instanceof Error)
		assert.equal(a.started, true)
		assert.equal(b.started, true)
		assert.equal(a.stopped, true)
		assert.equal(b.stopped, true)
	})

	await t.test('per-lifecycle onStart timeout triggers failure with telemetry', async () => {
		const SLOW = createToken<SlowStart>('SLOW')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		let err: unknown
		try {
			await orch.start([{ token: SLOW, provider: { useFactory: () => new SlowStart(30) }, dependencies: [], timeouts: { onStart: 10 } }])
		}
		catch (e) {
			err = e
		}
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Errors during start/)
		// removed formatted prefix assertion
		type WithDiag = Error & { code?: string }
		assert.equal((err as WithDiag).code, 'ORK1013')
		assert.ok(isAggregateLifecycleError(err))
		const details = err.details
		assert.ok(Array.isArray(details))
		assert.ok(details.every(isLifecycleErrorDetail))
		assert.ok(details.some(d => d.tokenDescription === 'SLOW' && d.phase === 'start' && d.timedOut && Number.isFinite(d.durationMs)))
		assert.ok(details.some(d => d.error.name === 'TimeoutError' || (d.error as Error & { code?: string }).code === 'ORK1021'))
	})

	await t.test('per-lifecycle onStop timeout triggers failure with telemetry', async () => {
		const SLOW_STOP = createToken<SlowStop>('SLOW_STOP')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		await orch.start([{ token: SLOW_STOP, provider: { useFactory: () => new SlowStop(30) }, dependencies: [], timeouts: { onStop: 10 } }])
		let err: unknown
		try {
			await orch.stop()
		}
		catch (e) {
			err = e
		}
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Errors during stop/)
		// removed formatted prefix assertion
		type WithDiag2 = Error & { code?: string }
		assert.equal((err as WithDiag2).code, 'ORK1014')
		assert.ok(isAggregateLifecycleError(err))
		const details = err.details
		assert.ok(Array.isArray(details))
		assert.ok(details.every(isLifecycleErrorDetail))
		assert.ok(details.some(d => d.tokenDescription === 'SLOW_STOP' && d.phase === 'stop' && d.timedOut && Number.isFinite(d.durationMs)))
		assert.ok(details.some(d => d.error.name === 'TimeoutError' || (d.error as Error & { code?: string }).code === 'ORK1021'))
	})

	await t.test('destroy() aggregates stop and destroy errors', async () => {
		const FB = createToken<FailingStopDestroyComponent>('FB')
		const app = new Orchestrator(new Container({ logger }), { logger })
		await app.start([register(FB, { useFactory: () => new FailingStopDestroyComponent({ logger }) })])
		await assert.rejects(() => app.destroy(), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Errors during destroy/)
			// removed formatted prefix assertion
			type WithDiag = Error & { code?: string }
			assert.equal((err as WithDiag).code, 'ORK1017')
			assert.ok(isAggregateLifecycleError(err))
			const details = err.details
			assert.ok(Array.isArray(details))
			assert.ok(details.every(isLifecycleErrorDetail))
			assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'stop'))
			assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'destroy'))
			return true
		})

		await app.destroy().catch(() => {})
	})

	await t.test('async provider guard: useValue Promise throws at registration', () => {
		const T = createToken<Promise<number>>('AsyncVal')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		assert.throws(() => orch.register(T, { useValue: Promise.resolve(1) }), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Async providers are not supported/)
			// removed formatted prefix assertion
			type WithDiag4 = Error & { code?: string }
			assert.equal((err as WithDiag4).code, 'ORK1010')
			return true
		})
	})

	await t.test('async provider guard: useFactory Promise throws at registration', () => {
		const T = createToken<number>('AsyncFactory')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		const prov = { useFactory: async () => 1 } as unknown as Provider<number>
		assert.throws(() => orch.register(T, prov), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Async providers are not supported/)
			// removed formatted prefix assertion
			type WithDiag5 = Error & { code?: string }
			assert.equal((err as WithDiag5).code, 'ORK1011')
			return true
		})
	})

	await t.test('register helper wires dependencies correctly', async () => {
		class A extends Adapter {}
		class B extends Adapter {}
		const TA = createToken<A>('A')
		const TB = createToken<B>('B')
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		await app.start([
			register(TA, { useFactory: () => new A({ logger }) }),
			register(TB, { useFactory: () => new B({ logger }) }, { dependencies: [TA] }),
		])
		assert.ok(c.get(TA) instanceof A)
		assert.ok(c.get(TB) instanceof B)
		await app.destroy()
	})

	await t.test('defaultTimeouts on orchestrator apply when register omits timeouts', async () => {
		class SlowS extends Adapter {
			protected async onStart() {
				// fast
			}

			protected async onStop() {
				await new Promise<void>(r => setTimeout(r, 30))
			}
		}
		const T = createToken<SlowS>('SlowS')
		const app = new Orchestrator(new Container({ logger }), { logger, timeouts: { onStop: 10 } })
		await app.start([register(T, { useFactory: () => new SlowS({ logger }) })])
		let err: unknown
		try {
			await app.stop()
		}
		catch (e) {
			err = e
		}
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Errors during stop/)
		// removed formatted prefix assertion
		type WithDiag3 = Error & { code?: string }
		assert.equal((err as WithDiag3).code, 'ORK1014')
		await app.destroy().catch(() => {})
	})

	await t.test('events callbacks are invoked for start/stop/destroy and errors', async () => {
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
		const app = new Orchestrator(new Container({ logger }), {
			logger,
			events: {
				onComponentStart: ({ token }: { token: symbol, durationMs: number }) => events.starts.push(tokenDescription(token)),
				onComponentStop: ({ token }: { token: symbol, durationMs: number }) => events.stops.push(tokenDescription(token)),
				onComponentDestroy: ({ token }: { token: symbol, durationMs: number }) => events.destroys.push(tokenDescription(token)),
				onComponentError: (d: { tokenDescription: string, phase: 'start' | 'stop' | 'destroy' }) => events.errors.push(`${d.tokenDescription}:${d.phase}`),
			},
		})
		await app.start([
			register(TOK, { useFactory: () => new Ok({ logger }) }),
			register(BAD, { useFactory: () => new BadStop({ logger }) }),
		])
		assert.ok(events.starts.includes('OK') && events.starts.includes('BAD'))
		let err: unknown
		try {
			await app.stop()
		}
		catch (e) {
			err = e
		}
		assert.ok(err instanceof Error)
		assert.ok(events.stops.includes('OK'))
		assert.ok(events.errors.some(e => e.startsWith('BAD:stop')))
		await app.destroy().catch(() => {})
		assert.ok(events.destroys.includes('OK') && events.destroys.includes('BAD'))
	})

	await t.test('register supports dependencies map and dedup/self-filter', async () => {
		class Cmp extends Adapter {
			public startedAt: number | null = null
			static counter = 0
			protected async onStart(): Promise<void> {
				this.startedAt = Cmp.counter++
			}
		}
		const A = createToken<Cmp>('A')
		const B = createToken<Cmp>('B')
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		await app.start([
			register(A, { useFactory: () => new Cmp({ logger }) }),
			register(B, { useFactory: () => new Cmp({ logger }) }, { dependencies: { d1: A, d2: A, self: B } }),
		])
		const a = c.get(A) as Cmp
		const b = c.get(B) as Cmp
		assert.ok(a instanceof Cmp && b instanceof Cmp)
		assert.ok((a.startedAt as number) < (b.startedAt as number))
		await app.destroy()
	})

	await t.test('register options allow per-registration onStart timeout', async () => {
		const SLOW = createToken<SlowStart>('SLOW_REG')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		let err: unknown
		try {
			await orch.start([
				register(SLOW, { useFactory: () => new SlowStart(100) }, { timeouts: { onStart: 10 } }),
			])
		}
		catch (e) {
			err = e
		}
		assert.ok(err instanceof Error)
		assert.match((err as Error).message, /Errors during start/)
	})

	await t.test('destroy() stops then destroys in one pass', async () => {
		class T extends Adapter {
			public started = false
			public stopped = false
			protected async onStart() {
				this.started = true
			}

			protected async onStop() {
				this.stopped = true
			}
		}
		const A = createToken<T>('T:A')
		const B = createToken<T>('T:B')
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		await app.start([
			register(A, { useFactory: () => new T({ logger }) }),
			register(B, { useFactory: () => new T({ logger }) }, { dependencies: [A] }),
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

	await t.test('tracer emits layers and per-phase outcomes', async () => {
		class A extends Adapter {}
		class B extends Adapter {}
		const TA = createToken<A>('Tracer:A')
		const TB = createToken<B>('Tracer:B')
		const layersSeen: string[][][] = []
		const phases: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean }[] }[] = []
		const app = new Orchestrator(new Container({ logger }), {
			logger,
			tracer: {
				onLayers: (payload: { layers: string[][] }) => { layersSeen.push(payload.layers) },
				onPhase: (payload: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean }[] }) => {
					phases.push({ phase: payload.phase, layer: payload.layer, outcomes: payload.outcomes.map(o => ({ token: o.token, ok: o.ok })) })
				},
			},
		})
		await app.start([
			register(TA, { useFactory: () => new A({ logger }) }),
			register(TB, { useFactory: () => new B({ logger }) }, { dependencies: [TA] }),
		])
		assert.ok(layersSeen.length >= 1)
		assert.ok(layersSeen[0].some(layer => layer.includes('Tracer:A')))
		assert.ok(layersSeen[0].some(layer => layer.includes('Tracer:B')))
		const startLayers = phases.filter(p => p.phase === 'start').map(p => p.layer)
		assert.ok(startLayers.includes(0) && startLayers.includes(1))
		assert.ok(phases.filter(p => p.phase === 'start').every(p => p.outcomes.every(o => o.ok)))
		await app.destroy()
		const sawStop = phases.some(p => p.phase === 'stop')
		const sawDestroy = phases.some(p => p.phase === 'destroy')
		assert.ok(sawStop && sawDestroy)
	})

	await t.test('tracer does not emit onPhase for layers with no outcomes', async () => {
		interface APort { a: true }
		interface BPort { b: true }
		const A = createToken<APort>('test:A')
		const B = createToken<BPort>('test:B')
		class BImpl extends Adapter implements BPort { b = true as const }
		const phases: Array<{ phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean, durationMs: number, timedOut?: boolean }[] }> = []
		const app = new Orchestrator(new Container({ logger }), {
			logger,
			tracer: {
				onLayers: () => {},
				onPhase: (p: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: Array<{ token: string, ok: boolean, durationMs: number, timedOut?: boolean }> }) => phases.push(p),
			},
		})
		app.register(A, { useValue: { a: true } })
		app.register(B, { useFactory: () => new BImpl({ logger }) }, [A])
		await app.start()
		try {
			assert.equal(phases.length > 0, true)
			const startPhases = phases.filter(p => p.phase === 'start')
			assert.equal(startPhases.length, 1)
			assert.equal(startPhases[0]?.layer, 1)
			assert.equal(Array.isArray(startPhases[0]?.outcomes), true)
			assert.equal((startPhases[0]?.outcomes?.length ?? 0) > 0, true)
		}
		finally {
			await app.destroy()
		}
	})

	await t.test('per-layer concurrency limit caps start parallelism', async () => {
		class ConcurrencyProbe extends Adapter {
			static activeStart = 0
			static peakStart = 0
			constructor(private readonly delayMs: number) { super({ logger }) }
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
		const app = new Orchestrator(new Container({ logger }), { logger, queue: new QueueAdapter({ concurrency: 2 }) })
		await app.start([
			register(T1, { useFactory: () => new ConcurrencyProbe(20) }),
			register(T2, { useFactory: () => new ConcurrencyProbe(20) }),
			register(T3, { useFactory: () => new ConcurrencyProbe(20) }),
			register(T4, { useFactory: () => new ConcurrencyProbe(20) }),
		])
		assert.ok(ConcurrencyProbe.peakStart <= 2)
		await app.destroy()
	})

	await t.test('per-layer concurrency limit caps stop and destroy parallelism', async () => {
		class ConcurrencyProbe extends Adapter {
			static activeStop = 0
			static peakStop = 0
			static activeDestroy = 0
			static peakDestroy = 0
			constructor(private readonly delayMs: number) { super({ logger }) }
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
		const app = new Orchestrator(new Container({ logger }), { logger, queue: new QueueAdapter({ concurrency: 2 }) })
		await app.start([
			register(T1, { useFactory: () => new ConcurrencyProbe(20) }),
			register(T2, { useFactory: () => new ConcurrencyProbe(20) }),
			register(T3, { useFactory: () => new ConcurrencyProbe(20) }),
			register(T4, { useFactory: () => new ConcurrencyProbe(20) }),
		])
		await app.stop().catch(() => {})
		assert.ok(ConcurrencyProbe.peakStop <= 2)
		await app.start().catch(() => {})
		await app.destroy().catch(() => {})
		assert.ok(ConcurrencyProbe.peakDestroy <= 2)
	})

	await t.test('rollback stops all previously started components on failure', async () => {
		const rng = makeRng(42)
		for (let iter = 0; iter < 10; iter++) {
			const { n, edges } = buildRandomDag(rng)
			const { Recorder } = makeRecorder()
			const tokens = Array.from({ length: n }, (_, i) => createToken<Adapter>(`X${i}`))
			const instances: Adapter[] = Array.from({ length: n }, () => new Recorder({ logger }))
			let edgeList: Array<[number, number]> = edges.slice()
			if (edgeList.length === 0) {
				if (n >= 2) edgeList = [[0, 1]]
				else continue
			}
			const pick = (makeRng(iter + 1)).rangeInt(0, edgeList.length - 1)
			const chosen = edgeList[pick]
			if (!chosen) continue
			const [_, v] = chosen
			instances[v] = new FailingOnStart({ logger })
			const c = new Container({ logger })
			const app = new Orchestrator(c, { logger })
			const depsFor = (idx: number) => edgeList.filter(([_, dst]) => dst === idx).map(([src]) => tokens[src])
			for (let i = 0; i < n; i++) app.register(tokens[i], { useValue: instances[i] }, depsFor(i))
			let err: unknown
			try {
				await app.start()
			}
			catch (e) {
				err = e
			}
			assert.ok(err instanceof Error, 'start should fail')
			for (let i = 0; i < n; i++) {
				const inst = instances[i]
				if (hasOrder(inst) && inst.startedAt !== null) {
					assert.notEqual(inst.stoppedAt, null, `node ${i} started but was not stopped during rollback`)
				}
			}
			await app.destroy().catch(() => {})
		}
	})

	await t.test('register helper supports useClass with tuple inject', async () => {
		interface LPort { info(msg: string): void }
		const TLOG = createToken<LPort>('Reg:LOG')
		const TCFG = createToken<{ n: number }>('Reg:CFG')
		class L implements LPort { info(_m: string) {} }
		class WithDeps extends Adapter {
			constructor(public readonly l: LPort, public readonly cfg: { n: number }) {
				super({ logger })
			}
		}
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		await app.start([
			register(TLOG, { useClass: L }),
			register(TCFG, { useValue: { n: 1 } }),
			register(createToken<WithDeps>('Reg:WITH'), { useClass: WithDeps, inject: [TLOG, TCFG] }, { dependencies: [TLOG, TCFG] }),
		])
		await app.destroy()
	})

	await t.test('start accepts direct useClass with tuple inject in registration object', async () => {
		interface LPort { info(msg: string): void }
		const TLOG = createToken<LPort>('Start:LOG')
		const TCFG = createToken<{ n: number }>('Start:CFG')
		class L implements LPort { info(_m: string) {} }
		class WithDeps extends Adapter {
			constructor(public readonly l: LPort, public readonly cfg: { n: number }) {
				super({ logger })
			}
		}
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		await app.start([
			{ token: TLOG, provider: { useClass: L } },
			{ token: TCFG, provider: { useValue: { n: 2 } } },
			{ token: createToken<WithDeps>('Start:WITH'), provider: { useClass: WithDeps, inject: [TLOG, TCFG] }, dependencies: [TLOG, TCFG] },
		])
		await app.destroy()
	})

	await t.test('infers dependencies from tuple inject for class provider when dependencies omitted', async () => {
		let counter = 0
		class Rec extends Adapter {
			public startedAt: number | null = null; protected async onStart() {
				this.startedAt = counter++
			}
		}
		class WithDeps extends Adapter {
			public startedAt: number | null = null
			constructor(public readonly a: Rec, public readonly b: Rec) { super({ logger }) }
			protected async onStart() { this.startedAt = counter++ }
		}
		const TA = createToken<Rec>('Infer:TA')
		const TB = createToken<Rec>('Infer:TB')
		const TC = createToken<WithDeps>('Infer:TC')
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		await app.start([
			register(TA, { useFactory: () => new Rec({ logger }) }),
			register(TB, { useFactory: () => new Rec({ logger }) }),
			// dependencies omitted; should be inferred from inject tuple
			register(TC, { useClass: WithDeps, inject: [TA, TB] }),
		])
		const a = c.get(TA) as Rec
		const b = c.get(TB) as Rec
		const withDeps = c.get(TC) as WithDeps
		assert.ok(a && b && withDeps)
		// injected identity preserved
		assert.equal(withDeps.a, a)
		assert.equal(withDeps.b, b)
		// start order respects inferred deps
		assert.ok((a.startedAt as number) < (withDeps.startedAt as number))
		assert.ok((b.startedAt as number) < (withDeps.startedAt as number))
		await app.destroy()
	})

	// NEW: inference from tuple inject without explicit dependencies (factory)
	await t.test('infers dependencies from tuple inject for factory provider when dependencies omitted', async () => {
		let counter = 0
		class Rec extends Adapter {
			public startedAt: number | null = null; protected async onStart() {
				this.startedAt = counter++
			}
		}
		class UsesDeps extends Adapter {
			public startedAt: number | null = null
			constructor(public readonly a: Rec, public readonly b: Rec) { super({ logger }) }
			protected async onStart() { this.startedAt = counter++ }
		}
		const TA = createToken<Rec>('InferF:TA')
		const TB = createToken<Rec>('InferF:TB')
		const TD = createToken<UsesDeps>('InferF:TD')
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		await app.start([
			register(TA, { useFactory: () => new Rec({ logger }) }),
			register(TB, { useFactory: () => new Rec({ logger }) }),
			// dependencies omitted; should be inferred from inject tuple
			register(TD, { useFactory: (a, b) => new UsesDeps(a, b), inject: [TA, TB] }),
		])
		const a = c.get(TA) as Rec
		const b = c.get(TB) as Rec
		const dep = c.get(TD) as UsesDeps
		assert.ok(a && b && dep)
		assert.equal(dep.a, a)
		assert.equal(dep.b, b)
		assert.ok((a.startedAt as number) < (dep.startedAt as number))
		assert.ok((b.startedAt as number) < (dep.startedAt as number))
		await app.destroy()
	})

	await t.test('tracer start outcomes include failures', async () => {
		class Good extends Adapter { protected async onStart() {} }
		class Bad extends Adapter {
			protected async onStart() {
				throw new Error('fail-start')
			}
		}
		const TG = createToken<Good>('TraceFail:GOOD')
		const TB = createToken<Bad>('TraceFail:BAD')
		const phases: { phase: 'start' | 'stop' | 'destroy', layer: number, outcomes: { token: string, ok: boolean, timedOut?: boolean }[] }[] = []
		const app = new Orchestrator(new Container({ logger }), { logger, tracer: { onLayers: () => {}, onPhase: p => phases.push(p) } })
		let err: unknown
		try {
			await app.start([
				register(TG, { useFactory: () => new Good({ logger }) }),
				register(TB, { useFactory: () => new Bad({ logger }) }, { dependencies: [TG] }),
			])
		}
		catch (e) {
			err = e
		}
		assert.ok(err instanceof Error)
		const startPhases = phases.filter(p => p.phase === 'start')
		assert.ok(startPhases.length >= 1)
		const allStartOutcomes = startPhases.flatMap(p => p.outcomes)
		assert.ok(allStartOutcomes.some(o => o.token === 'TraceFail:GOOD' && o.ok))
		assert.ok(allStartOutcomes.some(o => o.token === 'TraceFail:BAD' && !o.ok))
		await app.destroy().catch(() => {})
	})

	await t.test('events callbacks errors are isolated and do not disrupt orchestration', async () => {
		class Ok extends Adapter { protected async onStart() {} protected async onStop() {} }
		class BadStop extends Adapter {
			protected async onStart() {}
			protected async onStop() {
				throw new Error('bad-stop')
			}
		}
		const TOK = createToken<Ok>('EvtIso:OK')
		const TBAD = createToken<BadStop>('EvtIso:BADSTOP')
		const events = {
			onComponentStart: () => {
				throw new Error('listener-fail-start')
			},
			onComponentError: () => {
				throw new Error('listener-fail-error')
			},
		}
		const app = new Orchestrator(new Container({ logger }), { logger, events })
		await app.start([
			register(TOK, { useFactory: () => new Ok({ logger }) }),
			register(TBAD, { useFactory: () => new BadStop({ logger }) }),
		])
		let stopErr: unknown
		try {
			await app.stop()
		}
		catch (e) {
			stopErr = e
		}
		assert.ok(stopErr instanceof Error)
		type WithDiag = Error & { code?: string }
		assert.equal((stopErr as WithDiag).code, 'ORK1014')
		await app.destroy().catch(() => {})
	})

	await t.test('duplicate registration for the same token throws ORK1007', () => {
		class C extends Adapter {}
		const T = createToken<C>('dup')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register(T, { useFactory: () => new C({ logger }) })
		assert.throws(() => orch.register(T, { useFactory: () => new C({ logger }) }), (err: unknown) => {
			assert.ok(err instanceof Error)
			assert.match((err as Error).message, /Duplicate registration/)
			// removed formatted prefix assertion
			return (err as Error & { code?: string }).code === 'ORK1007'
		})
	})

	await t.test('numeric defaultTimeouts apply to all phases', async () => {
		class SlowBoth extends Adapter {
			protected async onStart() {
				// fast
			}

			protected async onStop() {
				await new Promise<void>(r => setTimeout(r, 15))
			}
		}
		const T = createToken<SlowBoth>('NumDef:SlowBoth')
		const app = new Orchestrator(new Container({ logger }), { logger, timeouts: 10 })
		await app.start([register(T, { useFactory: () => new SlowBoth({ logger }) })])
		let stopErr: unknown
		try {
			await app.stop()
		}
		catch (e) {
			stopErr = e
		}
		assert.ok(stopErr instanceof Error)
		assert.ok(isAggregateLifecycleError(stopErr))
		const det = stopErr.details
		assert.ok(Array.isArray(det))
		assert.ok(det.some(d => d.tokenDescription === 'NumDef:SlowBoth' && d.timedOut && d.phase === 'stop'))
		await app.destroy().catch(() => {})
	})

	// NEW: orchestrator.using promise handling and named resolution
	await t.test('orchestrator.using(fn) awaits promised return and forwards value', async () => {
		for (const name of orchestrator.list()) orchestrator.clear(name, true)
		const app = new Orchestrator(new Container({ logger }), { logger })
		orchestrator.set('app1', app)
		const value = await orchestrator.using(async (_app) => {
			await Promise.resolve(1)
			return 123
		}, 'app1')
		assert.equal(value, 123)
	})

	await t.test('orchestrator.using(apply, fn) supports async apply and fn and returns value', async () => {
		for (const name of orchestrator.list()) orchestrator.clear(name, true)
		const app = new Orchestrator(new Container({ logger }), { logger })
		orchestrator.set('oX', app)
		const T = createToken<number>('orch:val')
		const res = await orchestrator.using(
			async (o) => {
				await new Promise(r => setTimeout(r, 1))
				o.container.set(T, 7)
			},
			async (o) => {
				await Promise.resolve()
				return (o.container.resolve(T) as number) * 6
			},
			'oX',
		)
		assert.equal(res, 42)
		// Note: orchestrator.using leverages container.using internally; current implementation applies to the bound container.
		assert.equal(app.container.resolve(T), 7)
	})

	await t.test('class provider with container arg is supported and resolves container deps', async () => {
		const DEP = createToken<number>('ClassWithContainer:DEP')
		class NeedsC extends Adapter {
			public got: number | undefined
			constructor(private readonly c: Container) { super({ logger }) }
			protected async onStart() { this.got = this.c.resolve(DEP) }
		}
		const T = createToken<NeedsC>('ClassWithContainer:COMP')
		const app = new Orchestrator(new Container({ logger }), { logger })
		app.container.set(DEP, 42)
		await app.start([register(T, { useClass: NeedsC })])
		const inst = app.container.get(T) as NeedsC
		assert.ok(inst instanceof NeedsC)
		assert.equal(inst.got, 42)
		await app.destroy()
	})
})
