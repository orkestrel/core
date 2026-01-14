import { describe, test, beforeEach, afterEach, assert, expect } from 'vitest'
import { NoopLogger,
	OrchestratorAdapter, orchestrator, createToken, ContainerAdapter, Adapter, tokenDescription, QueueAdapter,
	isAggregateLifecycleError, isLifecycleErrorDetail,
} from '@orkestrel/core'

let logger: NoopLogger

class TestComponent extends Adapter {
	static override instance: TestComponent | undefined
	public readonly name: string
	public startedAt: number | null = null
	public stoppedAt: number | null = null
	static counter = 0
	constructor(name: string) {
		super({ logger })
		this.name = name
	}

	protected override async onStart(): Promise<void> {
		this.startedAt = TestComponent.counter++
	}

	protected override async onStop(): Promise<void> {
		this.stoppedAt = TestComponent.counter++
	}
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

	test('starts components in topological order', async() => {
		TestComponent.counter = 0

		// Create separate adapter classes for each component
		class ComponentA extends Adapter {
			static override instance: ComponentA | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class ComponentB extends Adapter {
			static override instance: ComponentB | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class ComponentC extends Adapter {
			static override instance: ComponentC | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}

		const A = createToken<ComponentA>('A')
		const B = createToken<ComponentB>('B')
		const C = createToken<ComponentC>('C')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orch.register({
			[A]: { adapter: ComponentA },
			[B]: { adapter: ComponentB, dependencies: [A] },
			[C]: { adapter: ComponentC, dependencies: [B] },
		})
		await orch.start()
		const a = ComponentA.getInstance()
		const b = ComponentB.getInstance()
		const c = ComponentC.getInstance()
		assert.equal(a.startedAt, 0)
		assert.equal(b.startedAt, 1)
		assert.equal(c.startedAt, 2)
		await orch.stop()
		assert.ok(typeof c.stoppedAt === 'number' && typeof b.stoppedAt === 'number' && c.stoppedAt < b.stoppedAt)
		assert.ok(typeof b.stoppedAt === 'number' && typeof a.stoppedAt === 'number' && b.stoppedAt < a.stoppedAt)

		// Cleanup
		await ComponentA.destroy()
		await ComponentB.destroy()
		await ComponentC.destroy()
	})

	test('detects dependency cycles', async() => {
		class CycleA extends Adapter {
			static override instance: CycleA | undefined
		}
		class CycleB extends Adapter {
			static override instance: CycleB | undefined
		}

		const A = createToken<CycleA>('A')
		const B = createToken<CycleB>('B')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orch.register({
			[A]: { adapter: CycleA, dependencies: [B] },
			[B]: { adapter: CycleB, dependencies: [A] },
		})
		try {
			await orch.start()
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			assert.match((err as Error).message, /Cycle detected/)
			type WithDiag = Error & { code?: string; helpUrl?: string };
			const e2 = err as WithDiag
			assert.equal(e2.code, 'ORK1009')
			if (typeof e2.helpUrl === 'string') {
				assert.ok(e2.helpUrl.includes('/api/index.html'), `helpUrl should include '/api/index.html'; actual: ${e2.helpUrl}`)
			}
		}
		await CycleA.destroy().catch(() => {})
		await CycleB.destroy().catch(() => {})
	})

	test('aggregates start errors and rolls back started components', async() => {
		class GoodComponent extends Adapter {
			static override instance: GoodComponent | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class BadComponent extends Adapter {
			static override instance: BadComponent | undefined
			protected override async onStart(): Promise<void> {
				throw new Error('boom')
			}
		}

		TestComponent.counter = 0
		const GOOD = createToken<GoodComponent>('GOOD')
		const BAD = createToken<BadComponent>('BAD')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orch.register({
			[GOOD]: { adapter: GoodComponent },
			[BAD]: { adapter: BadComponent, dependencies: [GOOD] },
		})
		try {
			await orch.start()
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated start error details')
			}
		}
		const good = GoodComponent.getInstance()
		assert.notEqual(good.startedAt, null)
		await orch.destroy().catch(() => {})
		await GoodComponent.destroy()
		await BadComponent.destroy()
	})

	test('unknown dependency error contains context', async() => {
		class ComponentA extends Adapter {
			static override instance: ComponentA | undefined
		}

		const A = createToken<ComponentA>('A')
		const B = createToken<Adapter>('B')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orch.register({
			[A]: { adapter: ComponentA, dependencies: [B] },
		})
		try {
			await orch.start()
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			assert.match((err as Error).message, /Unknown dependency B required by A/)
			type WithDiag = Error & { code?: string };
			assert.equal((err as WithDiag).code, 'ORK1008')
		}
		await ComponentA.destroy().catch(() => {})
	})

	test('destroy aggregates component and container errors', async() => {
		class GoodComp extends Adapter {
			static override instance: GoodComp | undefined
		}
		class BadComp extends Adapter {
			static override instance: BadComp | undefined
			protected override async onDestroy(): Promise<void> {
				throw new Error('bye')
			}
		}

		const BAD = createToken<BadComp>('BAD')
		const GOOD = createToken<GoodComp>('GOOD')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orch.register({
			[GOOD]: { adapter: GoodComp },
			[BAD]: { adapter: BadComp },
		})
		await orch.start()
		await orch.stop()
		try {
			await orch.destroy()
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			assert.match((err as Error).message, /Errors during destroy/)
			type WithDiag = Error & { code?: string };
			assert.equal((err as WithDiag).code, 'ORK1017')
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated destroy error details')
			}
		}
		await GoodComp.destroy().catch(() => {})
		await BadComp.destroy().catch(() => {})
	})

	test('global getter supports default symbol and named string keys', async() => {
		for (const name of orchestrator.list()) {
			orchestrator.clear(name, true)
		}
		const got = orchestrator()
		assert.ok(got)
		const other = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orchestrator.set('other', other)
		assert.equal(orchestrator('other'), other)
		const names = orchestrator.list()
		assert.ok(names.some(k => typeof k !== 'string'))
		assert.ok(names.some((k: string | symbol) => k === 'other'))
		assert.equal(orchestrator.clear('other', true), true)
	})

	test('start rollback stops previously started components on failure', async() => {
		class TrackA extends Adapter {
			static override instance: TrackA | undefined
			public started = false
			public stopped = false
			protected override async onStart(): Promise<void> {
				this.started = true
			}

			protected override async onStop(): Promise<void> {
				this.stopped = true
			}
		}
		class TrackB extends Adapter {
			static override instance: TrackB | undefined
			public started = false
			public stopped = false
			protected override async onStart(): Promise<void> {
				this.started = true
			}

			protected override async onStop(): Promise<void> {
				this.stopped = true
			}
		}
		class FailingX extends Adapter {
			static override instance: FailingX | undefined
			protected override async onStart(): Promise<void> {
				throw new Error('boom')
			}
		}

		const A = createToken<TrackA>('A')
		const B = createToken<TrackB>('B')
		const X = createToken<FailingX>('X')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
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
		const a = TrackA.getInstance()
		const b = TrackB.getInstance()
		assert.deepStrictEqual(
			{ aStarted: a.started, bStarted: b.started, aStopped: a.stopped, bStopped: b.stopped, hasErr: !!err },
			{ aStarted: true, bStarted: true, aStopped: true, bStopped: true, hasErr: true },
		)
	})

	test('per-lifecycle onStart timeout triggers failure with telemetry', async() => {
		class SlowStartAdapter extends Adapter {
			static override instance: SlowStartAdapter | undefined
			protected override async onStart(): Promise<void> {
				await new Promise(r => setTimeout(r, 30))
			}
		}

		const SLOW = createToken<SlowStartAdapter>('SLOW')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
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
		type WithDiag = Error & { code?: string };
		assert.equal((err as WithDiag).code, 'ORK1013')
		if (!isAggregateLifecycleError(err)) assert.fail('expected aggregate lifecycle error')
		const det = err.details
		assert.ok(det.every(isLifecycleErrorDetail))
		assert.ok(det.some(d => d.tokenDescription === 'SLOW' && d.phase === 'start' && d.timedOut && Number.isFinite(d.durationMs)))
		assert.ok(det.some(d => d.error.name === 'TimeoutError' || (d.error as Error & { code?: string }).code === 'ORK1021'))
		await SlowStartAdapter.destroy().catch(() => {})
	})

	test('per-lifecycle onStop timeout triggers failure with telemetry', async() => {
		class SlowStopAdapter extends Adapter {
			static override instance: SlowStopAdapter | undefined
			protected override async onStop(): Promise<void> {
				await new Promise(r => setTimeout(r, 30))
			}
		}

		const SLOW_STOP = createToken<SlowStopAdapter>('SLOW_STOP')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
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
		type WithDiag2 = Error & { code?: string };
		assert.equal((err as WithDiag2).code, 'ORK1014')
		if (!isAggregateLifecycleError(err)) assert.fail('expected aggregate lifecycle error')
		const details = err.details
		assert.ok(details.every(isLifecycleErrorDetail))
		assert.ok(details.some(d => d.tokenDescription === 'SLOW_STOP' && d.phase === 'stop' && d.timedOut && Number.isFinite(d.durationMs)))
		assert.ok(details.some(d => d.error.name === 'TimeoutError' || (d.error as Error & { code?: string }).code === 'ORK1021'))
		await SlowStopAdapter.destroy().catch(() => {})
	})

	test('destroy() aggregates stop and destroy errors', async() => {
		class FailingBoth extends Adapter {
			static override instance: FailingBoth | undefined
			protected override async onStop() {
				throw new Error('stop-bad')
			}

			protected override async onDestroy() {
				throw new Error('destroy-bad')
			}
		}

		const FB = createToken<FailingBoth>('FB')
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		app.register({
			[FB]: { adapter: FailingBoth },
		})
		await app.start()
		try {
			await app.destroy()
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			assert.match((err as Error).message, /Errors during destroy/)
			type WithDiag = Error & { code?: string };
			assert.equal((err as WithDiag).code, 'ORK1017')
			if (!isAggregateLifecycleError(err)) assert.fail('Expected aggregate lifecycle error')
			const details = err.details
			assert.ok(details.every(isLifecycleErrorDetail))
			assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'stop'))
			assert.ok(details.some(d => d.tokenDescription === 'FB' && d.phase === 'destroy'))
		}

		await app.destroy().catch(() => {})
		await FailingBoth.destroy().catch(() => {})
	})

	test('dependency graph wires dependencies correctly', async() => {
		class A extends Adapter {
			static override instance: A | undefined
		}
		class B extends Adapter {
			static override instance: B | undefined
		}
		const TA = createToken<A>('A')
		const TB = createToken<B>('B')
		const c = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(c, { logger })
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

	test('defaultTimeouts on orchestrator apply when register omits timeouts', async() => {
		class SlowS extends Adapter {
			static override instance: SlowS | undefined
			protected override async onStart() {}

			protected override async onStop() {
				await new Promise<void>(r => setTimeout(r, 30))
			}
		}
		const T = createToken<SlowS>('SlowS')
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger, timeouts: { onStop: 10 } })
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
		type WithDiag3 = Error & { code?: string };
		assert.equal((err as WithDiag3).code, 'ORK1014')
		await app.destroy().catch(() => {})
		await SlowS.destroy().catch(() => {})
	})

	test('events callbacks are invoked for start/stop/destroy and errors', async() => {
		class Ok extends Adapter {
			static override instance: Ok | undefined
			protected override async onStart() {}
			protected override async onStop() {}
			protected override async onDestroy() {}
		}
		class BadStop extends Adapter {
			static override instance: BadStop | undefined
			protected override async onStop() {
				throw new Error('nope')
			}
		}
		const TOK = createToken<Ok>('OK')
		const BAD = createToken<BadStop>('BAD')
		const events: { starts: string[]; stops: string[]; destroys: string[]; errors: string[] } = { starts: [], stops: [], destroys: [], errors: [] }
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), {
			logger,
			events: {
				onComponentStart: ({ token }: { token: symbol; durationMs: number }) => events.starts.push(tokenDescription(token)),
				onComponentStop: ({ token }: { token: symbol; durationMs: number }) => events.stops.push(tokenDescription(token)),
				onComponentDestroy: ({ token }: { token: symbol; durationMs: number }) => events.destroys.push(tokenDescription(token)),
				onComponentError: (d: { tokenDescription: string; phase: 'start' | 'stop' | 'destroy' }) => events.errors.push(`${d.tokenDescription}:${d.phase}`),
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

	test('register supports dependencies map and dedup/self-filter', async() => {
		class CmpA extends Adapter {
			static override instance: CmpA | undefined
			public startedAt: number | null = null
			static counter = 0
			protected override async onStart(): Promise<void> {
				this.startedAt = CmpA.counter++
			}
		}
		class CmpB extends Adapter {
			static override instance: CmpB | undefined
			public startedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = CmpA.counter++
			}
		}
		const A = createToken<CmpA>('A')
		const B = createToken<CmpB>('B')
		const c = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(c, { logger })
		app.register({
			[A]: { adapter: CmpA },
			[B]: { adapter: CmpB, dependencies: [A] },
		})
		await app.start()
		const a = c.get(A)
		const b = c.get(B)
		assert.ok(a && b)
		assert.ok(typeof a.startedAt === 'number' && typeof b.startedAt === 'number' && a.startedAt < b.startedAt)
		await app.destroy()
		await CmpA.destroy()
		await CmpB.destroy()
	})

	test('register options allow per-registration onStart timeout', async() => {
		class SlowAdapter extends Adapter {
			static override instance: SlowAdapter | undefined
			protected override async onStart(): Promise<void> {
				await new Promise(r => setTimeout(r, 100))
			}
		}
		const SLOW = createToken<SlowAdapter>('SLOW_REG')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
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

	test('tracer emits layers and per-phase outcomes', async() => {
		class A extends Adapter {
			static override instance: A | undefined
		}
		class B extends Adapter {
			static override instance: B | undefined
		}
		const TA = createToken<A>('Tracer:A')
		const TB = createToken<B>('Tracer:B')
		const layersSeen: string[][][] = []
		const phases: { phase: 'start' | 'stop' | 'destroy'; layer: number; outcomes: { token: string; ok: boolean }[] }[] = []
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), {
			logger,
			tracer: {
				onLayers: (payload: { layers: string[][] }) => { layersSeen.push(payload.layers) },
				onPhase: (payload: { phase: 'start' | 'stop' | 'destroy'; layer: number; outcomes: { token: string; ok: boolean }[] }) => {
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

	test('per-layer concurrency limit caps start parallelism', async() => {
		let activeStart = 0
		let peakStart = 0
		class Probe1 extends Adapter {
			static override instance: Probe1 | undefined
			protected override async onStart() {
				activeStart++
				peakStart = Math.max(peakStart, activeStart)
				await new Promise(r => setTimeout(r, 20))
				activeStart--
			}
		}
		class Probe2 extends Adapter {
			static override instance: Probe2 | undefined
			protected override async onStart() {
				activeStart++
				peakStart = Math.max(peakStart, activeStart)
				await new Promise(r => setTimeout(r, 20))
				activeStart--
			}
		}
		class Probe3 extends Adapter {
			static override instance: Probe3 | undefined
			protected override async onStart() {
				activeStart++
				peakStart = Math.max(peakStart, activeStart)
				await new Promise(r => setTimeout(r, 20))
				activeStart--
			}
		}
		class Probe4 extends Adapter {
			static override instance: Probe4 | undefined
			protected override async onStart() {
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
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger, queue: new QueueAdapter({ concurrency: 2 }) })
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

	test('per-layer concurrency limit caps stop and destroy parallelism', async() => {
		let activeStop = 0
		let peakStop = 0
		let activeDestroy = 0
		let peakDestroy = 0
		class Probe1 extends Adapter {
			static override instance: Probe1 | undefined
			protected override async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}

			protected override async onDestroy() {
				activeDestroy++
				peakDestroy = Math.max(peakDestroy, activeDestroy)
				await new Promise(r => setTimeout(r, 20))
				activeDestroy--
			}
		}
		class Probe2 extends Adapter {
			static override instance: Probe2 | undefined
			protected override async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}

			protected override async onDestroy() {
				activeDestroy++
				peakDestroy = Math.max(peakDestroy, activeDestroy)
				await new Promise(r => setTimeout(r, 20))
				activeDestroy--
			}
		}
		class Probe3 extends Adapter {
			static override instance: Probe3 | undefined
			protected override async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}

			protected override async onDestroy() {
				activeDestroy++
				peakDestroy = Math.max(peakDestroy, activeDestroy)
				await new Promise(r => setTimeout(r, 20))
				activeDestroy--
			}
		}
		class Probe4 extends Adapter {
			static override instance: Probe4 | undefined
			protected override async onStop() {
				activeStop++
				peakStop = Math.max(peakStop, activeStop)
				await new Promise(r => setTimeout(r, 20))
				activeStop--
			}

			protected override async onDestroy() {
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
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger, queue: new QueueAdapter({ concurrency: 2 }) })
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

	test('tracer start outcomes include failures (first)', async() => {
		class Good extends Adapter {
			static override instance: Good | undefined
			protected override async onStart() {}
		}
		class Bad extends Adapter {
			static override instance: Bad | undefined
			protected override async onStart() {
				throw new Error('fail-start')
			}
		}
		const TG = createToken<Good>('TraceFail:GOOD')
		const TB = createToken<Bad>('TraceFail:BAD')
		const phases: { phase: 'start' | 'stop' | 'destroy'; layer: number; outcomes: { token: string; ok: boolean; timedOut?: boolean }[] }[] = []
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger, tracer: { onLayers: () => {}, onPhase: p => phases.push(p) } })
		let err: unknown
		try {
			app.register({
				[TG]: { adapter: Good },
				[TB]: { adapter: Bad, dependencies: [TG] },
			})
			await app.start()
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
		await Good.destroy()
		await Bad.destroy()
	})

	test('destroy() stops then destroys in one pass', async() => {
		class TA extends Adapter {
			static override instance: TA | undefined
			public started = false
			public stopped = false
			protected override async onStart() {
				this.started = true
			}

			protected override async onStop() {
				this.stopped = true
			}
		}
		class TB extends Adapter {
			static override instance: TB | undefined
			public started = false
			public stopped = false
			protected override async onStart() {
				this.started = true
			}

			protected override async onStop() {
				this.stopped = true
			}
		}
		const A = createToken<TA>('T:A')
		const B = createToken<TB>('T:B')
		const c = new ContainerAdapter({ logger })
		const app = new OrchestratorAdapter(c, { logger })
		app.register({
			[A]: { adapter: TA },
			[B]: { adapter: TB, dependencies: [A] },
		})
		await app.start()
		const a = c.get(A)
		const b = c.get(B)
		assert.ok(a && b)
		assert.equal(a.started, true)
		assert.equal(b.started, true)
		await app.destroy()
		assert.equal(a.stopped, true)
		assert.equal(b.stopped, true)
		assert.equal(a.state, 'destroyed')
		assert.equal(b.state, 'destroyed')
		await TA.destroy()
		await TB.destroy()
	})

	test('tracer start outcomes include failures', async() => {
		class Good extends Adapter {
			static override instance: Good | undefined
			protected override async onStart() {}
		}
		class Bad extends Adapter {
			static override instance: Bad | undefined
			protected override async onStart() {
				throw new Error('fail-start')
			}
		}
		const TG = createToken<Good>('TraceFail:GOOD')
		const TB = createToken<Bad>('TraceFail:BAD')
		const phases: { phase: 'start' | 'stop' | 'destroy'; layer: number; outcomes: { token: string; ok: boolean; timedOut?: boolean }[] }[] = []
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger, tracer: { onLayers: () => {}, onPhase: p => phases.push(p) } })
		let err: unknown
		try {
			app.register({
				[TG]: { adapter: Good },
				[TB]: { adapter: Bad, dependencies: [TG] },
			})
			await app.start()
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
		await Good.destroy()
		await Bad.destroy()
	})

	test('events callbacks errors are isolated and do not disrupt orchestration', async() => {
		class Ok extends Adapter {
			static override instance: Ok | undefined
			protected override async onStart() {}
			protected override async onStop() {}
		}
		class BadStop extends Adapter {
			static override instance: BadStop | undefined
			protected override async onStart() {}
			protected override async onStop() {
				throw new Error('bad-stop')
			}
		}
		const TOK = createToken<Ok>('EvtIso:OK')
		const TBAD = createToken<BadStop>('EvtIso:BADSTOP')
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), {
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
		app.register({
			[TOK]: { adapter: Ok },
			[TBAD]: { adapter: BadStop },
		})
		await app.start()
		let stopErr: unknown
		try {
			await app.stop()
		}
		catch (e) {
			stopErr = e
		}
		type WithDiag = Error & { code?: string };
		assert.equal((stopErr as WithDiag).code, 'ORK1014')
		await app.destroy().catch(() => {})
		await Ok.destroy()
		await BadStop.destroy()
	})

	test('duplicate registration for the same token throws ORK1007', () => {
		class C extends Adapter {
			static override instance: C | undefined
		}
		const T = createToken<C>('dup')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orch.register({ [T]: { adapter: C } })
		try {
			orch.register({ [T]: { adapter: C } })
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			assert.match((err as Error).message, /Duplicate registration/)
			assert.equal((err as Error & { code?: string }).code, 'ORK1007')
		}
	})

	test('numeric defaultTimeouts apply to all phases', async() => {
		class SlowBoth extends Adapter {
			static override instance: SlowBoth | undefined
			protected override async onStart() {}

			protected override async onStop() {
				await new Promise<void>(r => setTimeout(r, 15))
			}
		}
		const T = createToken<SlowBoth>('NumDef:SlowBoth')
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger, timeouts: 10 })
		app.register({
			[T]: { adapter: SlowBoth },
		})
		await app.start()
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
		await SlowBoth.destroy()
	})

	test('orchestrator.using(fn) awaits promised return and forwards value', async() => {
		for (const name of orchestrator.list()) orchestrator.clear(name, true)
		const app = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })
		orchestrator.set('app1', app)
		const value = await orchestrator.using(async(_app) => {
			await Promise.resolve(1)
			return 123
		}, 'app1')
		assert.equal(value, 123)
	})

	test('register with dependency graph object', async() => {
		TestComponent.counter = 0
		class CompA extends Adapter {
			static override instance: CompA | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class CompB extends Adapter {
			static override instance: CompB | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class CompC extends Adapter {
			static override instance: CompC | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		const A = createToken<CompA>('A')
		const B = createToken<CompB>('B')
		const C = createToken<CompC>('C')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })

		orch.register({
			[A]: { adapter: CompA },
			[B]: { adapter: CompB, dependencies: [A] },
			[C]: { adapter: CompC, dependencies: [B] },
		})

		await orch.start()
		const a = orch.container.get(A)
		const b = orch.container.get(B)
		const c = orch.container.get(C)

		assert.ok(a && b && c)
		assert.equal(a.startedAt, 0)
		assert.equal(b.startedAt, 1)
		assert.equal(c.startedAt, 2)

		await orch.stop()
		assert.ok(typeof c.stoppedAt === 'number' && typeof b.stoppedAt === 'number' && c.stoppedAt < b.stoppedAt)
		assert.ok(typeof b.stoppedAt === 'number' && typeof a.stoppedAt === 'number' && b.stoppedAt < a.stoppedAt)
		await orch.destroy()
		await CompA.destroy()
		await CompB.destroy()
		await CompC.destroy()
	})

	test('start with dependency graph object', async() => {
		// Similar to register test - reuse same classes
		TestComponent.counter = 0
		class CompA extends Adapter {
			static override instance: CompA | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class CompB extends Adapter {
			static override instance: CompB | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		class CompC extends Adapter {
			static override instance: CompC | undefined
			public startedAt: number | null = null
			public stoppedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}

			protected override async onStop(): Promise<void> {
				this.stoppedAt = TestComponent.counter++
			}
		}
		const A = createToken<CompA>('A')
		const B = createToken<CompB>('B')
		const C = createToken<CompC>('C')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })

		orch.register({
			[A]: { adapter: CompA },
			[B]: { adapter: CompB, dependencies: [A] },
			[C]: { adapter: CompC, dependencies: [B] },
		})
		await orch.start()

		const a = orch.container.get(A)
		const b = orch.container.get(B)
		const c = orch.container.get(C)

		assert.ok(a && b && c)
		assert.equal(a.startedAt, 0)
		assert.equal(b.startedAt, 1)
		assert.equal(c.startedAt, 2)

		await orch.stop()
		assert.ok(typeof c.stoppedAt === 'number' && typeof b.stoppedAt === 'number' && c.stoppedAt < b.stoppedAt)
		assert.ok(typeof b.stoppedAt === 'number' && typeof a.stoppedAt === 'number' && b.stoppedAt < a.stoppedAt)
		await orch.destroy()
		await CompA.destroy()
		await CompB.destroy()
		await CompC.destroy()
	})

	test('dependency graph with timeouts', async() => {
		class SlowA extends Adapter {
			static override instance: SlowA | undefined
			protected override async onStart(): Promise<void> {
				await new Promise(r => setTimeout(r, 50))
			}
		}
		class SlowB extends Adapter {
			static override instance: SlowB | undefined
			protected override async onStart(): Promise<void> {
				await new Promise(r => setTimeout(r, 50))
			}
		}
		const A = createToken<SlowA>('A')
		const B = createToken<SlowB>('B')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })

		orch.register({
			[A]: { adapter: SlowA, timeouts: { onStart: 1000 } },
			[B]: { adapter: SlowB, dependencies: [A], timeouts: { onStart: 1000 } },
		})

		await orch.start()
		const a = orch.container.get(A)
		const b = orch.container.get(B)

		assert.ok(a && b)
		assert.equal(a.state, 'started')
		assert.equal(b.state, 'started')
		await orch.destroy()
		await SlowA.destroy()
		await SlowB.destroy()
	})

	test('dependency graph detects cycles', async() => {
		class CycleA extends Adapter {
			static override instance: CycleA | undefined
		}
		class CycleB extends Adapter {
			static override instance: CycleB | undefined
		}
		const A = createToken<CycleA>('A')
		const B = createToken<CycleB>('B')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })

		orch.register({
			[A]: { adapter: CycleA, dependencies: [B] },
			[B]: { adapter: CycleB, dependencies: [A] },
		})

		try {
			await orch.start()
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			assert.match((err as Error).message, /Cycle detected/)
			type WithDiag = Error & { code?: string };
			assert.equal((err as WithDiag).code, 'ORK1009')
		}
		await orch.destroy().catch(() => {})
		await CycleA.destroy().catch(() => {})
		await CycleB.destroy().catch(() => {})
	})

	test('dependency graph errors aggregate on start failure', async() => {
		TestComponent.counter = 0
		class GoodComp extends Adapter {
			static override instance: GoodComp | undefined
			public startedAt: number | null = null
			protected override async onStart(): Promise<void> {
				this.startedAt = TestComponent.counter++
			}
		}
		class BadComp extends Adapter {
			static override instance: BadComp | undefined
			protected override async onStart(): Promise<void> {
				throw new Error('boom')
			}
		}
		const GOOD = createToken<GoodComp>('GOOD')
		const BAD = createToken<BadComp>('BAD')
		const orch = new OrchestratorAdapter(new ContainerAdapter({ logger }), { logger })

		orch.register({
			[GOOD]: { adapter: GoodComp },
			[BAD]: { adapter: BadComp, dependencies: [GOOD] },
		})

		try {
			await orch.start()
			assert.fail('Expected error to be thrown')
		} catch (err: unknown) {
			if (isAggregateLifecycleError(err)) {
				const hasHookFail = err.details.some(d => (d.error as Error & { code?: string }).code === 'ORK1022')
				if (!hasHookFail) assert.fail('Expected ORK1022 in aggregated start error details')
			}
		}

		const good = orch.container.get(GOOD)
		assert.notEqual(good?.startedAt, null)
		await orch.destroy().catch(() => {})
		await GoodComp.destroy()
		await BadComp.destroy()
	})
})
