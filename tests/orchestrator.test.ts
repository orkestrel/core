import { describe, test, beforeEach, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import type { Token } from '@orkestrel/core'
import { NoopLogger,
	Orchestrator, orchestrator, createToken, Container, Adapter, tokenDescription, QueueAdapter,
	isAggregateLifecycleError, isLifecycleErrorDetail,
} from '@orkestrel/core'
import { hasOwn } from '@orkestrel/validator'

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
	readonly #delayMs: number
	constructor(delayMs: number) {
		super({ logger })
		this.#delayMs = delayMs
	}

	protected async onStart(): Promise<void> {
		await new Promise(r => setTimeout(r, this.#delayMs))
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
	readonly #delayMs: number
	constructor(delayMs: number) {
		super({ logger })
		this.#delayMs = delayMs
	}

	protected async onStop(): Promise<void> {
		await new Promise(r => setTimeout(r, this.#delayMs))
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
		next() {
			return (this.nextU32() & 0xffffffff) / 0x100000000
		},
		rangeInt(min: number, max: number) {
			const r = this.next()
			return Math.floor(min + r * (max - min + 1))
		},
		chance(p: number) {
			return this.next() < p
		},
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
	return { Recorder }
}

class FailingOnStart extends Adapter {
	protected async onStart(): Promise<void> {
		throw new Error('fail-start')
	}
}

type HasOrder = { startedAt: number | null, stoppedAt: number | null }
function hasOrder(x: unknown): x is HasOrder {
	return hasOwn(x, 'startedAt', 'stoppedAt')
}

describe('Orchestrator suite', () => {
	beforeEach(() => {
		logger = new NoopLogger()
		for (const name of orchestrator.list()) {
			orchestrator.clear(name, true)
		}
	})
	afterEach(() => {
		for (const name of orchestrator.list()) {
			orchestrator.clear(name, true)
		}
	})

	test('starts components in topological order', async () => {
		TestComponent.counter = 0
		
		// Create separate adapter classes for each component
		class ComponentA extends Adapter {
			static instance?: ComponentA
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}
			protected async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class ComponentB extends Adapter {
			static instance?: ComponentB
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}
			protected async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class ComponentC extends Adapter {
			static instance?: ComponentC
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}
			protected async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		
		const A = createToken<ComponentA>('A')
		const B = createToken<ComponentB>('B')
		const C = createToken<ComponentC>('C')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({
			[A]: { adapter: ComponentA },
			[B]: { adapter: ComponentB, dependencies: [A] },
			[C]: { adapter: ComponentC, dependencies: [B] },
		})
		await orch.start()
		const a = ComponentA.getInstance() as ComponentA
		const b = ComponentB.getInstance() as ComponentB
		const c = ComponentC.getInstance() as ComponentC
		assert.equal(a.startedAt, 0)
		assert.equal(b.startedAt, 1)
		assert.equal(c.startedAt, 2)
		await orch.stop()
		assert.ok((c.stoppedAt as number) < (b.stoppedAt as number))
		assert.ok((b.stoppedAt as number) < (a.stoppedAt as number))
		
		// Cleanup
		await ComponentA.destroy()
		await ComponentB.destroy()
		await ComponentC.destroy()
	})

	test('detects dependency cycles', async () => {
		class CycleA extends Adapter {
			static instance?: CycleA
		}
		class CycleB extends Adapter {
			static instance?: CycleB
		}
		
		const A = createToken<CycleA>('A')
		const B = createToken<CycleB>('B')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({
			[A]: { adapter: CycleA, dependencies: [B] },
			[B]: { adapter: CycleB, dependencies: [A] },
		})
		await assert.rejects(() => orch.start(), (err: unknown) => {
			assert.match((err as Error).message, /Cycle detected/)
			type WithDiag = Error & { code?: string, helpUrl?: string }
			const e2 = err as WithDiag
			assert.equal(e2.code, 'ORK1009')
			if (typeof e2.helpUrl === 'string') {
				assert.ok(e2.helpUrl.includes('/api/index.html'), `helpUrl should include '/api/index.html'; actual: ${e2.helpUrl}`)
			}
			return true
		})
		await CycleA.destroy().catch(() => {})
		await CycleB.destroy().catch(() => {})
	})

	test('aggregates start errors and rolls back started components', async () => {
		class GoodComponent extends Adapter {
			static instance?: GoodComponent
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}
			protected async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class BadComponent extends Adapter {
			static instance?: BadComponent
			protected async onStart(): Promise<void> {
				throw new Error('boom')
			}
		}
		
		TestComponent.counter = 0
		const GOOD = createToken<GoodComponent>('GOOD')
		const BAD = createToken<BadComponent>('BAD')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({
			[GOOD]: { adapter: GoodComponent },
			[BAD]: { adapter: BadComponent, dependencies: [GOOD] },
		})
		await assert.rejects(async () => orch.start(), (err: unknown) => {
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated start error details')
			}
			return true
		})
		const good = GoodComponent.getInstance() as GoodComponent
		assert.notEqual(good.startedAt, null)
		await orch.destroy().catch(() => {})
		await GoodComponent.destroy()
		await BadComponent.destroy()
	})

	test('unknown dependency error contains context', async () => {
		class ComponentA extends Adapter {
			static instance?: ComponentA
		}
		
		const A = createToken<ComponentA>('A')
		const B = createToken<Adapter>('B')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({
			[A]: { adapter: ComponentA, dependencies: [B] },
		})
		await assert.rejects(() => orch.start(), (err: unknown) => {
			assert.match((err as Error).message, /Unknown dependency B required by A/)
			type WithDiag = Error & { code?: string }
			assert.equal((err as WithDiag).code, 'ORK1008')
			return true
		})
		await ComponentA.destroy().catch(() => {})
	})

	test('destroy aggregates component and container errors', async () => {
		class GoodComp extends Adapter {
			static instance?: GoodComp
		}
		class BadComp extends Adapter {
			static instance?: BadComp
			protected async onDestroy(): Promise<void> {
				throw new Error('bye')
			}
		}
		
		const BAD = createToken<BadComp>('BAD')
		const GOOD = createToken<GoodComp>('GOOD')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({
			[GOOD]: { adapter: GoodComp },
			[BAD]: { adapter: BadComp },
		})
		await orch.start()
		await orch.stop()
		await assert.rejects(() => orch.destroy(), (err: unknown) => {
			assert.match((err as Error).message, /Errors during destroy/)
			type WithDiag = Error & { code?: string }
			assert.equal((err as WithDiag).code, 'ORK1017')
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated destroy error details')
			}
			return true
		})
		await GoodComp.destroy().catch(() => {})
		await BadComp.destroy().catch(() => {})
	})

	test('global getter supports default symbol and named string keys', async () => {
		for (const name of orchestrator.list()) {
			orchestrator.clear(name, true)
		}
		const got = orchestrator()
		assert.ok(got)
		const other = new Orchestrator(new Container({ logger }), { logger })
		orchestrator.set('other', other)
		assert.equal(orchestrator('other'), other)
		const names = orchestrator.list()
		assert.ok(names.some(k => typeof k !== 'string'))
		assert.ok(names.some((k: string | symbol) => k === 'other'))
		assert.equal(orchestrator.clear('other', true), true)
	})

	test('start rollback stops previously started components on failure', async () => {
		class TrackA extends Adapter {
			static instance?: TrackA
			public started = false
			public stopped = false
			protected async onStart(): Promise<void> {
				this.started = true
			}
			protected async onStop(): Promise<void> {
				this.stopped = true
			}
		}
		class TrackB extends Adapter {
			static instance?: TrackB
			public started = false
			public stopped = false
			protected async onStart(): Promise<void> {
				this.started = true
			}
			protected async onStop(): Promise<void> {
				this.stopped = true
			}
		}
		class FailingX extends Adapter {
			static instance?: FailingX
			protected async onStart(): Promise<void> {
				throw new Error('boom')
			}
		}
		
		const A = createToken<TrackA>('A')
		const B = createToken<TrackB>('B')
		const X = createToken<FailingX>('X')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({
			[A]: { adapter: TrackA },
			[B]: { adapter: TrackB, dependencies: [A] },
			[X]: { adapter: FailingX, dependencies: [A] },
		})
		let err: unknown
		try {
			await orch.start()
		}
		catch (e) {
			err = e
		}
		const a = TrackA.getInstance() as TrackA
		const b = TrackB.getInstance() as TrackB
		assert.deepStrictEqual(
			{ aStarted: a.started, bStarted: b.started, aStopped: a.stopped, bStopped: b.stopped, hasErr: !!err },
			{ aStarted: true, bStarted: true, aStopped: true, bStopped: true, hasErr: true },
		)
	})

	test('per-lifecycle onStart timeout triggers failure with telemetry', async () => {
		class SlowStartAdapter extends Adapter {
			static instance?: SlowStartAdapter
			protected async onStart(): Promise<void> {
				await new Promise(r => setTimeout(r, 30))
			}
		}
		
		const SLOW = createToken<SlowStartAdapter>('SLOW')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		let err: unknown
		try {
			orch.register({
				[SLOW]: { adapter: SlowStartAdapter, timeouts: { onStart: 10 } },
			})
			await orch.start()
		}
		catch (e) {
			err = e
		}
		assert.match((err as Error).message, /Errors during start/)
		type WithDiag = Error & { code?: string }
		assert.equal((err as WithDiag).code, 'ORK1013')
		if (!isAggregateLifecycleError(err)) assert.fail('expected aggregate lifecycle error')
		const det = err.details
		assert.ok(det.every(isLifecycleErrorDetail))
		assert.ok(det.some(d => d.tokenDescription === 'SLOW' && d.phase === 'start' && d.timedOut && Number.isFinite(d.durationMs)))
		assert.ok(det.some(d => d.error.name === 'TimeoutError' || (d.error as Error & { code?: string }).code === 'ORK1021'))
		await SlowStartAdapter.destroy().catch(() => {})
	})

	test('per-lifecycle onStop timeout triggers failure with telemetry', async () => {
		class SlowStopAdapter extends Adapter {
			static instance?: SlowStopAdapter
			protected async onStop(): Promise<void> {
				await new Promise(r => setTimeout(r, 30))
			}
		}
		
		const SLOW_STOP = createToken<SlowStopAdapter>('SLOW_STOP')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({
			[SLOW_STOP]: { adapter: SlowStopAdapter, timeouts: { onStop: 10 } },
		})
		await orch.start()
		let err: unknown
		try {
			await orch.stop()
		}
		catch (e) {
			err = e
		}
		assert.match((err as Error).message, /Errors during stop/)
		type WithDiag2 = Error & { code?: string }
		assert.equal((err as WithDiag2).code, 'ORK1014')
		if (!isAggregateLifecycleError(err)) assert.fail('expected aggregate lifecycle error')
		const details = err.details
		assert.ok(details.every(isLifecycleErrorDetail))
		assert.ok(details.some(d => d.tokenDescription === 'SLOW_STOP' && d.phase === 'stop' && d.timedOut && Number.isFinite(d.durationMs)))
		assert.ok(details.some(d => d.error.name === 'TimeoutError' || (d.error as Error & { code?: string }).code === 'ORK1021'))
		await SlowStopAdapter.destroy().catch(() => {})
	})

	test('destroy() aggregates stop and destroy errors', async () => {
		class FailingBoth extends Adapter {
			static instance?: FailingBoth
			protected async onStop() {
				throw new Error('stop-bad')
			}
			protected async onDestroy() {
				throw new Error('destroy-bad')
			}
		}
		
		const FB = createToken<FailingBoth>('FB')
		const app = new Orchestrator(new Container({ logger }), { logger })
		app.register({
			[FB]: { adapter: FailingBoth },
		})
		await app.start()
		await assert.rejects(() => app.destroy(), (err: unknown) => {
			assert.match((err as Error).message, /Errors during destroy/)
			type WithDiag = Error & { code?: string }
			assert.equal((err as WithDiag).code, 'ORK1017')
			if (!isAggregateLifecycleError(err)) return false
			const details = err.details
			assert.ok(details.every(isLifecycleErrorDetail))
			assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'stop'))
			assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'destroy'))
			return true
		})

		await app.destroy().catch(() => {})
		await FailingBoth.destroy().catch(() => {})
	})

	test.skip('async provider guard: useValue Promise throws at registration (REMOVED - no longer applicable with Adapter-only architecture)', () => {
		// This test is no longer applicable since we only accept Adapter classes now
		// AdapterProvider doesn't support async values
	})

	test.skip('async provider guard: useFactory Promise throws at registration (REMOVED - no longer applicable with Adapter-only architecture)', () => {
		// This test is no longer applicable since we only accept Adapter classes now
		// AdapterProvider doesn't support factories
	})

	test('dependency graph wires dependencies correctly', async () => {
		class A extends Adapter {
			static instance?: A
		}
		class B extends Adapter {
			static instance?: B
		}
		const TA = createToken<A>('A')
		const TB = createToken<B>('B')
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		app.register({
			[TA]: { adapter: A },
			[TB]: { adapter: B, dependencies: [TA] },
		})
		await app.start()
		assert.ok(c.get(TA) instanceof A)
		assert.ok(c.get(TB) instanceof B)
		await app.destroy()
		await A.destroy()
		await B.destroy()
	})

	test('defaultTimeouts on orchestrator apply when register omits timeouts', async () => {
		class SlowS extends Adapter {
			static instance?: SlowS
			protected async onStart() {}

			protected async onStop() {
				await new Promise<void>(r => setTimeout(r, 30))
			}
		}
		const T = createToken<SlowS>('SlowS')
		const app = new Orchestrator(new Container({ logger }), { logger, timeouts: { onStop: 10 } })
		app.register({
			[T]: { adapter: SlowS },
		})
		await app.start()
		let err: unknown
		try {
			await app.stop()
		}
		catch (e) {
			err = e
		}
		assert.match((err as Error).message, /Errors during stop/)
		type WithDiag3 = Error & { code?: string }
		assert.equal((err as WithDiag3).code, 'ORK1014')
		await app.destroy().catch(() => {})
		await SlowS.destroy().catch(() => {})
	})

	test('events callbacks are invoked for start/stop/destroy and errors', async () => {
		class Ok extends Adapter {
			static instance?: Ok
			protected async onStart() {}
			protected async onStop() {}
			protected async onDestroy() {}
		}
		class BadStop extends Adapter {
			static instance?: BadStop
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
		app.register({
			[TOK]: { adapter: Ok },
			[BAD]: { adapter: BadStop },
		})
		await app.start()
		assert.deepStrictEqual(
			{ hasOK: events.starts.includes('OK'), hasBAD: events.starts.includes('BAD') },
			{ hasOK: true, hasBAD: true },
		)
		let err: unknown
		try {
			await app.stop()
		}
		catch (e) { err = e }
		assert.deepStrictEqual(
			{ hasOK: events.stops.includes('OK'), hasBadStopError: events.errors.some(e => e.startsWith('BAD:stop')), hasErr: !!err },
			{ hasOK: true, hasBadStopError: true, hasErr: true },
		)
		await app.destroy().catch(() => {})
		assert.deepStrictEqual(
			{ hasOK: events.destroys.includes('OK'), hasBAD: events.destroys.includes('BAD') },
			{ hasOK: true, hasBAD: true },
		)
	})

	test('register supports dependencies map and dedup/self-filter', async () => {
		class CmpA extends Adapter {
			static instance?: CmpA
			public startedAt: number | null = null
			static counter = 0
			protected async onStart(): Promise<void> {
				this.startedAt = CmpA.counter++
			}
		}
		class CmpB extends Adapter {
			static instance?: CmpB
			public startedAt: number | null = null
			protected async onStart(): Promise<void> {
				this.startedAt = CmpA.counter++
			}
		}
		const A = createToken<CmpA>('A')
		const B = createToken<CmpB>('B')
		const c = new Container({ logger })
		const app = new Orchestrator(c, { logger })
		app.register({
			[A]: { adapter: CmpA },
			[B]: { adapter: CmpB, dependencies: [A] },
		})
		await app.start()
		const a = c.get(A) as CmpA
		const b = c.get(B) as CmpB
		assert.ok(a && b)
		assert.ok((a.startedAt as number) < (b.startedAt as number))
		await app.destroy()
		await CmpA.destroy()
		await CmpB.destroy()
	})

	test('register options allow per-registration onStart timeout', async () => {
		class SlowAdapter extends Adapter {
			static instance?: SlowAdapter
			protected async onStart(): Promise<void> {
				await new Promise(r => setTimeout(r, 100))
			}
		}
		const SLOW = createToken<SlowAdapter>('SLOW_REG')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		let err: unknown
		try {
			orch.register({
				[SLOW]: { adapter: SlowAdapter, timeouts: { onStart: 10 } },
			})
			await orch.start()
		}
		catch (e) { err = e }
		assert.match((err as Error).message, /Errors during start/)
		await SlowAdapter.destroy().catch(() => {})
	})

	test('tracer emits layers and per-phase outcomes', async () => {
		class A extends Adapter {
			static instance?: A
		}
		class B extends Adapter {
			static instance?: B
		}
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
		app.register({
			[TA]: { adapter: A },
			[TB]: { adapter: B, dependencies: [TA] },
		})
		await app.start()
		const first = layersSeen[0] ?? []
		const startLayers = phases.filter(p => p.phase === 'start').map(p => p.layer)
		assert.deepStrictEqual(
			{
				sawLayers: layersSeen.length >= 1,
				layerHasA: first.some(layer => layer.includes('Tracer:A')),
				layerHasB: first.some(layer => layer.includes('Tracer:B')),
				startHas0: startLayers.includes(0),
				startHas1: startLayers.includes(1),
				allStartOk: phases.filter(p => p.phase === 'start').every(p => p.outcomes.every(o => o.ok)),
			},
			{ sawLayers: true, layerHasA: true, layerHasB: true, startHas0: true, startHas1: true, allStartOk: true },
		)
		await app.destroy()
		const sawStop = phases.some(p => p.phase === 'stop')
		const sawDestroy = phases.some(p => p.phase === 'destroy')
		assert.deepStrictEqual({ sawStop, sawDestroy }, { sawStop: true, sawDestroy: true })
		await A.destroy()
		await B.destroy()
	})

	test('per-layer concurrency limit caps start parallelism', async () => {
		let activeStart = 0
		let peakStart = 0
		class Probe1 extends Adapter {
			static instance?: Probe1
			protected async onStart() {
				activeStart++
				peakStart = Math.max(peakStart, activeStart)
				await new Promise(r => setTimeout(r, 20))
				activeStart--
			}
		}
		class Probe2 extends Adapter {
			static instance?: Probe2
			protected async onStart() {
				activeStart++
				peakStart = Math.max(peakStart, activeStart)
				await new Promise(r => setTimeout(r, 20))
				activeStart--
			}
		}
		class Probe3 extends Adapter {
			static instance?: Probe3
			protected async onStart() {
				activeStart++
				peakStart = Math.max(peakStart, activeStart)
				await new Promise(r => setTimeout(r, 20))
				activeStart--
			}
		}
		class Probe4 extends Adapter {
			static instance?: Probe4
			protected async onStart() {
				activeStart++
				peakStart = Math.max(peakStart, activeStart)
				await new Promise(r => setTimeout(r, 20))
				activeStart--
			}
		}
		
		const T1 = createToken<Probe1>('CC1')
		const T2 = createToken<Probe2>('CC2')
		const T3 = createToken<Probe3>('CC3')
		const T4 = createToken<Probe4>('CC4')
		const app = new Orchestrator(new Container({ logger }), { logger, queue: new QueueAdapter({ concurrency: 2 }) })
		app.register({
			[T1]: { adapter: Probe1 },
			[T2]: { adapter: Probe2 },
			[T3]: { adapter: Probe3 },
			[T4]: { adapter: Probe4 },
		})
		await app.start()
		assert.ok(peakStart <= 2)
		await app.destroy()
		await Probe1.destroy()
		await Probe2.destroy()
		await Probe3.destroy()
		await Probe4.destroy()
	})

	test('per-layer concurrency limit caps stop and destroy parallelism', async () => {
		let activeStop = 0
		let peakStop = 0
		let activeDestroy = 0
		let peakDestroy = 0
		class Probe1 extends Adapter {
			static instance?: Probe1
			protected async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}
			protected async onDestroy() {
				activeDestroy++
				peakDestroy = Math.max(peakDestroy, activeDestroy)
				await new Promise(r => setTimeout(r, 20))
				activeDestroy--
			}
		}
		class Probe2 extends Adapter {
			static instance?: Probe2
			protected async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}
			protected async onDestroy() {
				activeDestroy++
				peakDestroy = Math.max(peakDestroy, activeDestroy)
				await new Promise(r => setTimeout(r, 20))
				activeDestroy--
			}
		}
		class Probe3 extends Adapter {
			static instance?: Probe3
			protected async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}
			protected async onDestroy() {
				activeDestroy++
				peakDestroy = Math.max(peakDestroy, activeDestroy)
				await new Promise(r => setTimeout(r, 20))
				activeDestroy--
			}
		}
		class Probe4 extends Adapter {
			static instance?: Probe4
			protected async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}
			protected async onDestroy() {
				activeDestroy++
				peakDestroy = Math.max(peakDestroy, activeDestroy)
				await new Promise(r => setTimeout(r, 20))
				activeDestroy--
			}
		}
		
		const T1 = createToken<Probe1>('CD1')
		const T2 = createToken<Probe2>('CD2')
		const T3 = createToken<Probe3>('CD3')
		const T4 = createToken<Probe4>('CD4')
		const app = new Orchestrator(new Container({ logger }), { logger, queue: new QueueAdapter({ concurrency: 2 }) })
		app.register({
			[T1]: { adapter: Probe1 },
			[T2]: { adapter: Probe2 },
			[T3]: { adapter: Probe3 },
			[T4]: { adapter: Probe4 },
		})
		await app.start()
		await app.stop().catch(() => {})
		assert.ok(peakStop <= 2)
		await app.start().catch(() => {})
		await app.destroy().catch(() => {})
		assert.ok(peakDestroy <= 2)
		await Probe1.destroy().catch(() => {})
		await Probe2.destroy().catch(() => {})
		await Probe3.destroy().catch(() => {})
		await Probe4.destroy().catch(() => {})
	})

	test('tracer start outcomes include failures', async () => {
		class Good extends Adapter {
			static instance?: Good
			protected async onStart() {}
		}
		class Bad extends Adapter {
			static instance?: Bad
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
			app.register({
				[TG]: { useFactory: () => new Good({ logger }) },
				[TB]: { useFactory: () => new Bad({ logger }), dependencies: [TG] },
			})
		}
		catch (e) {
			err = e
		}
		const startPhases = phases.filter(p => p.phase === 'start')
		const allStartOutcomes = startPhases.flatMap(p => p.outcomes)
		assert.deepStrictEqual(
			{
				hasStartPhase: startPhases.length >= 1,
				goodOk: allStartOutcomes.some(o => o.token === 'TraceFail:GOOD' && o.ok),
				badNotOk: allStartOutcomes.some(o => o.token === 'TraceFail:BAD' && !o.ok),
				hasErr: !!err,
			},
			{ hasStartPhase: true, goodOk: true, badNotOk: true, hasErr: true },
		)
		await app.destroy().catch(() => {})
	})

	test('tracer does not emit onPhase for layers with no outcomes', async () => {
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
		app.register({
			[A]: { useValue: { a: true } },
			[B]: { useFactory: () => new BImpl({ logger }), dependencies: [A] },
		})
		await app.start()
		try {
			const startPhases = phases.filter(p => p.phase === 'start')
			assert.deepStrictEqual(
				{
					sawAny: phases.length > 0,
					startCountIs1: startPhases.length === 1,
					startLayerIs1: startPhases[0]?.layer === 1,
					outcomesArray: Array.isArray(startPhases[0]?.outcomes),
					outcomesNonEmpty: (startPhases[0]?.outcomes?.length ?? 0) > 0,
				},
				{ sawAny: true, startCountIs1: true, startLayerIs1: true, outcomesArray: true, outcomesNonEmpty: true },
			)
		}
		finally {
			await app.destroy()
		}
	})

	test('destroy() stops then destroys in one pass', async () => {
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
		await app.start({
			[A]: { useFactory: () => new T({ logger }) },
			[B]: { useFactory: () => new T({ logger }), dependencies: [A] },
		})
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

	test('rollback stops all previously started components on failure', async () => {
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
			const graph: Record<symbol, { useValue: Adapter, dependencies?: Token<unknown>[] }> = {}
			for (let i = 0; i < n; i++) {
				const deps = depsFor(i)
				graph[tokens[i]] = deps.length > 0 ? { useValue: instances[i], dependencies: deps } : { useValue: instances[i] }
			}
			app.register(graph)
			try {
				await app.start()
			}
			catch { /* empty */ }
			for (let i = 0; i < n; i++) {
				const inst = instances[i]
				if (hasOrder(inst) && inst.startedAt !== null) {
					assert.notEqual(inst.stoppedAt, null, `node ${i} started but was not stopped during rollback`)
				}
			}
			await app.destroy().catch(() => {})
		}
	})

	test.skip('register helper supports useClass with tuple inject (REMOVED - no longer applicable with Adapter-only)', async () => {
		// This feature has been removed - we no longer support useClass providers with inject patterns
		// AdapterProvider is simpler and uses explicit dependencies
	})

	test.skip('start accepts direct useClass with tuple inject in registration object (REMOVED - no longer applicable with Adapter-only)', async () => {
		// This feature has been removed - we no longer support useClass providers with inject patterns
		// AdapterProvider is simpler and uses explicit dependencies
	})

	test.skip('infers dependencies from tuple inject for class provider when dependencies omitted (REMOVED - no longer applicable with Adapter-only)', async () => {
		let counter = 0
		class Rec extends Adapter {
			public startedAt: number | null = null
			protected async onStart() {
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
		await app.start({
			[TA]: { useFactory: () => new Rec({ logger }) },
			[TB]: { useFactory: () => new Rec({ logger }) },
			// dependencies omitted; should be inferred from inject tuple
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			[TC]: { useClass: WithDeps, inject: [TA, TB] } as any,
		})
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

	test.skip('infers dependencies from tuple inject for factory provider when dependencies omitted (REMOVED - no longer applicable with Adapter-only)', async () => {
		// This feature has been removed - automatic dependency inference from inject patterns
		// AdapterProvider uses explicit dependencies only
	})

	test('tracer start outcomes include failures', async () => {
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
			await app.start({
				[TG]: { useFactory: () => new Good({ logger }) },
				[TB]: { useFactory: () => new Bad({ logger }), dependencies: [TG] },
			})
		}
		catch (e) {
			err = e
		}
		const startPhases = phases.filter(p => p.phase === 'start')
		const allStartOutcomes = startPhases.flatMap(p => p.outcomes)
		assert.deepStrictEqual(
			{
				hasStartPhase: startPhases.length >= 1,
				goodOk: allStartOutcomes.some(o => o.token === 'TraceFail:GOOD' && o.ok),
				badNotOk: allStartOutcomes.some(o => o.token === 'TraceFail:BAD' && !o.ok),
				hasErr: !!err,
			},
			{ hasStartPhase: true, goodOk: true, badNotOk: true, hasErr: true },
		)
		await app.destroy().catch(() => {})
	})

	test('events callbacks errors are isolated and do not disrupt orchestration', async () => {
		class Ok extends Adapter {
			protected async onStart() {}
			protected async onStop() {}
		}
		class BadStop extends Adapter {
			protected async onStart() {}
			protected async onStop() {
				throw new Error('bad-stop')
			}
		}
		const TOK = createToken<Ok>('EvtIso:OK')
		const TBAD = createToken<BadStop>('EvtIso:BADSTOP')
		const app = new Orchestrator(new Container({ logger }), {
			logger,
			events: {
				onComponentStart: () => {
					throw new Error('listener-fail-start')
				},
				onComponentError: () => {
					throw new Error('listener-fail-error')
				},
			},
		})
		await app.start({
			[TOK]: { useFactory: () => new Ok({ logger }) },
			[TBAD]: { useFactory: () => new BadStop({ logger }) },
		})
		let stopErr: unknown
		try {
			await app.stop()
		}
		catch (e) {
			stopErr = e
		}
		type WithDiag = Error & { code?: string }
		assert.equal((stopErr as WithDiag).code, 'ORK1014')
		await app.destroy().catch(() => {})
	})

	test('duplicate registration for the same token throws ORK1007', () => {
		class C extends Adapter {}
		const T = createToken<C>('dup')
		const orch = new Orchestrator(new Container({ logger }), { logger })
		orch.register({ [T]: { useFactory: () => new C({ logger }) } })
		assert.throws(() => orch.register({ [T]: { useFactory: () => new C({ logger }) } }), (err: unknown) => {
			assert.match((err as Error).message, /Duplicate registration/)
			// removed formatted prefix assertion
			return (err as Error & { code?: string }).code === 'ORK1007'
		})
	})

	test('numeric defaultTimeouts apply to all phases', async () => {
		class SlowBoth extends Adapter {
			protected async onStart() {}

			protected async onStop() {
				await new Promise<void>(r => setTimeout(r, 15))
			}
		}
		const T = createToken<SlowBoth>('NumDef:SlowBoth')
		const app = new Orchestrator(new Container({ logger }), { logger, timeouts: 10 })
		await app.start({
			[T]: { useFactory: () => new SlowBoth({ logger }) },
		})
		let stopErr: unknown
		try {
			await app.stop()
		}
		catch (e) {
			stopErr = e
		}
		if (!isAggregateLifecycleError(stopErr)) assert.fail('expected aggregate lifecycle error')
		const det = stopErr.details
		assert.ok(det.some(d => d.tokenDescription === 'NumDef:SlowBoth' && d.timedOut && d.phase === 'stop'))
		await app.destroy().catch(() => {})
	})

	test('orchestrator.using(fn) awaits promised return and forwards value', async () => {
		for (const name of orchestrator.list()) orchestrator.clear(name, true)
		const app = new Orchestrator(new Container({ logger }), { logger })
		orchestrator.set('app1', app)
		const value = await orchestrator.using(async (_app) => {
			await Promise.resolve(1)
			return 123
		}, 'app1')
		assert.equal(value, 123)
	})

	test('orchestrator.using(apply, fn) supports async apply and fn and returns value', async () => {
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

	test('class provider with container arg is supported and resolves container deps', async () => {
		const DEP = createToken<number>('ClassWithContainer:DEP')
		class NeedsC extends Adapter {
			public got: number | undefined
			readonly #c: Container
			constructor(c: Container) {
				super({ logger })
				this.#c = c
			}

			protected async onStart() {
				this.got = this.#c.resolve(DEP)
			}
		}
		const T = createToken<NeedsC>('ClassWithContainer:COMP')
		const app = new Orchestrator(new Container({ logger }), { logger })
		app.container.set(DEP, 42)
		await app.start({
			[T]: { useClass: NeedsC },
		})
		const inst = app.container.get(T) as NeedsC
		assert.ok(inst)
		assert.equal(inst.got, 42)
		await app.destroy()
	})

	test('register with dependency graph object', async () => {
		TestComponent.counter = 0
		const A = createToken<TestComponent>('A')
		const B = createToken<TestComponent>('B')
		const C = createToken<TestComponent>('C')
		const orch = new Orchestrator(new Container({ logger }), { logger })

		orch.register({
			[A]: { useFactory: () => new TestComponent('A') },
			[B]: { useFactory: () => new TestComponent('B'), dependencies: [A] },
			[C]: { useFactory: () => new TestComponent('C'), dependencies: [B] },
		})

		await orch.start()
		const a = orch.container.get(A) as TestComponent
		const b = orch.container.get(B) as TestComponent
		const c = orch.container.get(C) as TestComponent

		assert.ok(a && b && c)
		assert.equal(a.startedAt, 0)
		assert.equal(b.startedAt, 1)
		assert.equal(c.startedAt, 2)

		await orch.stop()
		assert.ok((c.stoppedAt as number) < (b.stoppedAt as number))
		assert.ok((b.stoppedAt as number) < (a.stoppedAt as number))
		await orch.destroy()
	})

	test('start with dependency graph object', async () => {
		TestComponent.counter = 0
		const A = createToken<TestComponent>('A')
		const B = createToken<TestComponent>('B')
		const C = createToken<TestComponent>('C')
		const orch = new Orchestrator(new Container({ logger }), { logger })

		await orch.start({
			[A]: { useFactory: () => new TestComponent('A') },
			[B]: { useFactory: () => new TestComponent('B'), dependencies: [A] },
			[C]: { useFactory: () => new TestComponent('C'), dependencies: [B] },
		})

		const a = orch.container.get(A) as TestComponent
		const b = orch.container.get(B) as TestComponent
		const c = orch.container.get(C) as TestComponent

		assert.ok(a && b && c)
		assert.equal(a.startedAt, 0)
		assert.equal(b.startedAt, 1)
		assert.equal(c.startedAt, 2)

		await orch.stop()
		assert.ok((c.stoppedAt as number) < (b.stoppedAt as number))
		assert.ok((b.stoppedAt as number) < (a.stoppedAt as number))
		await orch.destroy()
	})

	test('dependency graph with timeouts', async () => {
		const A = createToken<SlowStart>('A')
		const B = createToken<SlowStart>('B')
		const orch = new Orchestrator(new Container({ logger }), { logger })

		orch.register({
			[A]: { useFactory: () => new SlowStart(50), timeouts: { onStart: 1000 } },
			[B]: { useFactory: () => new SlowStart(50), dependencies: [A], timeouts: { onStart: 1000 } },
		})

		await orch.start()
		const a = orch.container.get(A) as SlowStart
		const b = orch.container.get(B) as SlowStart

		assert.ok(a && b)
		assert.equal(a.state, 'started')
		assert.equal(b.state, 'started')
		await orch.destroy()
	})

	test('dependency graph detects cycles', async () => {
		const A = createToken<TestComponent>('A')
		const B = createToken<TestComponent>('B')
		const orch = new Orchestrator(new Container({ logger }), { logger })

		orch.register({
			[A]: { useFactory: () => new TestComponent('A'), dependencies: [B] },
			[B]: { useFactory: () => new TestComponent('B'), dependencies: [A] },
		})

		await assert.rejects(() => orch.start(), (err: unknown) => {
			assert.match((err as Error).message, /Cycle detected/)
			type WithDiag = Error & { code?: string }
			assert.equal((err as WithDiag).code, 'ORK1009')
			return true
		})
		await orch.destroy().catch(() => {})
	})

	test('dependency graph with mixed value and factory providers', async () => {
		TestComponent.counter = 0
		const A = createToken<number>('A')
		const B = createToken<TestComponent>('B')
		const C = createToken<TestComponent>('C')
		const orch = new Orchestrator(new Container({ logger }), { logger })

		await orch.start({
			[A]: { useValue: 42 },
			[B]: { useFactory: () => new TestComponent('B'), dependencies: [A] },
			[C]: { useFactory: () => new TestComponent('C'), dependencies: [B] },
		})

		const a = orch.container.get(A)
		const b = orch.container.get(B) as TestComponent
		const c = orch.container.get(C) as TestComponent

		assert.equal(a, 42)
		assert.ok(b && c)
		assert.equal(b.startedAt, 0)
		assert.equal(c.startedAt, 1)
		await orch.destroy()
	})

	test('dependency graph errors aggregate on start failure', async () => {
		TestComponent.counter = 0
		const GOOD = createToken<TestComponent>('GOOD')
		const BAD = createToken<FailingStartComponent>('BAD')
		const orch = new Orchestrator(new Container({ logger }), { logger })

		await assert.rejects(async () => orch.start({
			[GOOD]: { useFactory: () => new TestComponent('GOOD') },
			[BAD]: { useFactory: () => new FailingStartComponent({ logger }), dependencies: [GOOD] },
		}), (err: unknown) => {
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated start error details')
			}
			return true
		})

		const good = orch.container.get(GOOD) as TestComponent
		assert.notEqual(good?.startedAt, null)
		await orch.destroy().catch(() => {})
	})
})
