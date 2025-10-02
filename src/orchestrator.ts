import type { Provider, Token, ValueProvider, FactoryProviderNoDeps, ClassProviderNoDeps, FactoryProviderWithTuple, ClassProviderWithTuple, FactoryProviderWithObject } from './container.js'
import { Container, isFactoryProvider, isValueProvider, container } from './container.js'
import { Lifecycle } from './lifecycle.js'
import { Registry } from './registry.js'
import { D, type LifecycleErrorDetail, type LifecyclePhase, AggregateLifecycleError, TimeoutError, tokenDescription } from './diagnostics.js'

// ---------------------------
// Internal types for clarity
// ---------------------------

/** Per-phase timeouts in milliseconds. */
type PhaseTimeouts = { onStart?: number, onStop?: number, onDestroy?: number }

type Task<T> = () => Promise<T>

type PhaseResultOk = { ok: true, durationMs: number }

type PhaseResultErr = { ok: false, durationMs: number, error: Error, timedOut: boolean }

type PhaseResult = PhaseResultOk | PhaseResultErr

type Outcome = Readonly<{ token: string, ok: boolean, durationMs: number, timedOut?: boolean }>

type DestroyJobResult = { stopOutcome?: Outcome, destroyOutcome?: Outcome, errors?: LifecycleErrorDetail[] }

/**
 * Registration descriptor used by {@link Orchestrator.start} and {@link Orchestrator.register}.
 */
export interface OrchestratorRegistration<T> {
	token: Token<T>
	provider: Provider<T>
	/** Optional explicit dependencies for this registration; affects start/stop ordering and rollback. */
	dependencies?: readonly Token<unknown>[]
	/** Optional per-phase timeouts in milliseconds. */
	timeouts?: PhaseTimeouts
}

/**
 * Options for configuring orchestrator behavior and telemetry.
 */
export interface OrchestratorOptions {
	/** Default per-phase timeouts in milliseconds (overridden by per-registration timeouts). */
	defaultTimeouts?: PhaseTimeouts
	/** Event callbacks for practical logging/metrics. */
	events?: {
		onComponentStart?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentStop?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentDestroy?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentError?: (detail: LifecycleErrorDetail) => void
	}
	/** Debug tracing hooks; zero-cost when unset. */
	tracer?: {
		onLayers?: (payload: { layers: string[][] }) => void
		onPhase?: (payload: { phase: LifecyclePhase, layer: number, outcomes: Outcome[] }) => void
	}
	/** Per-layer concurrency cap; default unlimited. */
	concurrency?: number
}

interface NodeEntry { token: Token<unknown>, dependencies: readonly Token<unknown>[], timeouts?: PhaseTimeouts }

/**
 * Deterministic lifecycle runner that starts, stops, and destroys components in dependency order.
 *
 * - Enforces async provider guards at registration time.
 * - Aggregates errors per phase with stable diagnostics codes.
 * - Supports telemetry via events and optional debug tracing of layers/phases.
 */
export class Orchestrator {
	private readonly container: Container
	private readonly nodes = new Map<Token<unknown>, NodeEntry>()
	private layers: Token<unknown>[][] | null = null
	private readonly defaultTimeouts: PhaseTimeouts
	private readonly events?: OrchestratorOptions['events']
	private readonly tracer?: OrchestratorOptions['tracer']
	private readonly concurrency?: number

	/**
	 * Construct an Orchestrator.
	 * - Pass a Container to bind to an existing one.
	 * - Or pass options to construct with a new internal Container.
	 * - Or pass both.
	 */
	constructor(containerOrOpts?: Container | OrchestratorOptions, maybeOpts?: OrchestratorOptions) {
		if (containerOrOpts instanceof Container) {
			this.container = containerOrOpts
			this.events = maybeOpts?.events
			this.tracer = maybeOpts?.tracer
			this.defaultTimeouts = maybeOpts?.defaultTimeouts ?? {}
			this.concurrency = maybeOpts?.concurrency
		}
		else {
			this.container = new Container()
			this.events = containerOrOpts?.events
			this.tracer = containerOrOpts?.tracer
			this.defaultTimeouts = containerOrOpts?.defaultTimeouts ?? {}
			this.concurrency = containerOrOpts?.concurrency
		}
	}

	// Public API
	/** Get the underlying Container bound to this orchestrator. */
	getContainer(): Container { return this.container }

	/**
	 * Register a component provider with optional explicit dependencies/timeouts.
	 * Throws on duplicate registrations or async provider shapes.
	 */
	register<T>(token: Token<T>, provider: Provider<T>, dependencies: readonly Token<unknown>[] = [], timeouts?: PhaseTimeouts): void {
		if (this.nodes.has(token)) throw D.duplicateRegistration(tokenDescription(token))
		this.nodes.set(token as Token<unknown>, { token: token as Token<unknown>, dependencies, timeouts })
		const guarded = this.guardProvider(token, provider)
		this.container.register(token, guarded)
		this.layers = null
	}

	/**
	 * Start all components in dependency order. Optionally register additional components first.
	 * On failure, previously started components are rolled back (stopped) in reverse order.
	 * Aggregates errors with code ORK1013.
	 */
	async start(regs: ReadonlyArray<OrchestratorRegistration<unknown>> = []): Promise<void> {
		// Register any provided components first
		for (const e of regs) {
			const deps = e.dependencies ?? []
			if (this.nodes.has(e.token)) throw D.duplicateRegistration(tokenDescription(e.token))
			this.nodes.set(e.token as Token<unknown>, { token: e.token as Token<unknown>, dependencies: deps, timeouts: e.timeouts })
			const guarded = this.guardProvider(e.token, e.provider)
			this.container.register(e.token, guarded)
		}
		this.layers = null
		// Start all components in dependency order (previously startAll)
		const layers = this.topoLayers()
		const startedOrder: { token: Token<unknown>, lc: Lifecycle }[] = []
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			type StartResult = { token: Token<unknown>, lc: Lifecycle, result: PhaseResult }
			const jobs: Array<Task<StartResult>> = []
			for (const tk of layer) {
				const inst = this.container.get(tk)
				if (inst instanceof Lifecycle && inst.state === 'created') {
					const timeoutMs = this.getTimeout(tk, 'start')
					jobs.push(async () => ({ token: tk, lc: inst, result: await this.runPhase(inst, 'start', timeoutMs) }))
				}
				else if (inst instanceof Lifecycle && inst.state === 'started') {
					startedOrder.push({ token: tk, lc: inst })
				}
			}
			const results = await this.runLayerWithTracing('start', i, jobs, ({ token: tkn, result: r }) => r.ok ? { token: tokenDescription(tkn), ok: true, durationMs: r.durationMs } : undefined)
			const failures: LifecycleErrorDetail[] = []
			const successes: { token: Token<unknown>, lc: Lifecycle, durationMs: number }[] = []
			for (const { token: tkn, lc, result: r } of results) {
				if (r.ok) {
					successes.push({ token: tkn, lc, durationMs: r.durationMs })
					this.events?.onComponentStart?.({ token: tkn, durationMs: r.durationMs })
				}
				else {
					const detail = D.makeDetail(tokenDescription(tkn), 'start', 'normal', r)
					failures.push(detail)
					this.events?.onComponentError?.(detail)
				}
			}
			if (failures.length > 0) {
				const toStop = [...startedOrder, ...successes].reverse()
				const rollbackErrors: LifecycleErrorDetail[] = []
				for (const batch of this.groupByLayerOrder(toStop.map(x => x.token))) {
					const stopJobs: Array<Task<{ outcome: Outcome, error?: LifecycleErrorDetail }>> = []
					for (const tk of batch) {
						const lc2 = this.container.get(tk)
						if (lc2 instanceof Lifecycle && lc2.state === 'started') {
							const timeoutMs = this.getTimeout(tk, 'stop')
							stopJobs.push(async () => this.stopToken(tk, lc2, timeoutMs, 'rollback'))
						}
					}
					const settled = await this.runLimited(stopJobs)
					for (const s of settled) if (s.error) rollbackErrors.push(s.error)
				}
				const agg = D.startAggregate()
				throw new AggregateLifecycleError({ code: agg.code, message: agg.message, helpUrl: agg.helpUrl }, [...failures, ...rollbackErrors])
			}
			for (const s of successes) startedOrder.push({ token: s.token, lc: s.lc })
		}
	}

	/** Stop started components in reverse dependency order; aggregates ORK1014 on failure. */
	async stop(): Promise<void> {
		const forwardLayers = this.topoLayers()
		const layers = forwardLayers.slice().reverse()
		const errors: LifecycleErrorDetail[] = []
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			const jobs: Array<Task<{ outcome: Outcome, error?: LifecycleErrorDetail }>> = []
			for (const tk of layer) {
				const inst = this.container.get(tk)
				if (inst instanceof Lifecycle && inst.state === 'started') {
					const timeoutMs = this.getTimeout(tk, 'stop')
					jobs.push(async () => this.stopToken(tk, inst, timeoutMs, 'normal'))
				}
			}
			const settled = await this.runLayerWithTracing('stop', forwardLayers.length - 1 - i, jobs, ({ outcome }) => outcome)
			for (const s of settled) if (s.error) errors.push(s.error)
		}
		if (errors.length) {
			const agg = D.stopAggregate()
			throw new AggregateLifecycleError({ code: agg.code, message: agg.message, helpUrl: agg.helpUrl }, errors)
		}
	}

	/**
	 * Stop (when needed) and destroy all components, then destroy the container.
	 * Aggregates ORK1017 on failure and includes container cleanup errors.
	 */
	async destroy(): Promise<void> {
		const forwardLayers = this.topoLayers()
		const layers = forwardLayers.slice().reverse()
		const errors: LifecycleErrorDetail[] = []
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			const stopOutcomes: Outcome[] = []
			const destroyOutcomes: Outcome[] = []
			const jobs: Array<Task<DestroyJobResult>> = []
			for (const tk of layer) {
				const inst = this.container.get(tk)
				if (!(inst instanceof Lifecycle)) continue
				if (inst.state === 'destroyed') continue
				const stopTimeout = this.getTimeout(tk, 'stop')
				const destroyTimeout = this.getTimeout(tk, 'destroy')
				jobs.push(async () => this.destroyToken(tk, inst, stopTimeout, destroyTimeout))
			}
			const settled = await this.runLimited(jobs)
			for (const r of settled) {
				if (r.stopOutcome) stopOutcomes.push(r.stopOutcome)
				if (r.destroyOutcome) destroyOutcomes.push(r.destroyOutcome)
				if (r.errors) errors.push(...r.errors)
			}
			const layerIdx = forwardLayers.length - 1 - i
			if (stopOutcomes.length) this.tracer?.onPhase?.({ phase: 'stop', layer: layerIdx, outcomes: stopOutcomes })
			if (destroyOutcomes.length) this.tracer?.onPhase?.({ phase: 'destroy', layer: layerIdx, outcomes: destroyOutcomes })
		}
		try {
			await this.container.destroy()
		}
		catch (e) {
			if (e instanceof AggregateLifecycleError) {
				errors.push(...e.details)
			}
			else if (e instanceof Error) {
				errors.push({ tokenDescription: 'container', phase: 'destroy', context: 'container', timedOut: false, durationMs: 0, error: e })
			}
		}
		if (errors.length) {
			const agg = D.destroyAggregate()
			throw new AggregateLifecycleError({ code: agg.code, message: agg.message, helpUrl: agg.helpUrl }, errors)
		}
	}

	// ---------------------------
	// Internals (helpers)
	// ---------------------------

	// Provider guard adjacent to register
	private guardProvider<T>(token: Token<T>, provider: Provider<T>): Provider<T> {
		if (isValueProvider(provider)) {
			const v = provider.useValue
			if (isPromiseLike(v)) {
				throw D.asyncUseValuePromise(tokenDescription(token))
			}
			return provider
		}
		if (isFactoryProvider(provider)) {
			const orig: (...args: unknown[]) => T = provider.useFactory as unknown as (...args: unknown[]) => T
			if (orig.constructor && orig.constructor.name === 'AsyncFunction') {
				throw D.asyncUseFactoryAsync(tokenDescription(token))
			}
			const wrapped: (...args: unknown[]) => T = (...args: unknown[]) => {
				const res = orig(...args)
				if (isPromiseLike(res)) {
					throw D.asyncUseFactoryPromise(tokenDescription(token))
				}
				return res as T
			}
			return { ...provider, useFactory: wrapped }
		}
		return provider
	}

	// Topology helpers used by start/stop/destroy
	private topoLayers(): Token<unknown>[][] {
		if (this.layers) return this.layers
		const nodes = Array.from(this.nodes.values())
		for (const n of nodes) {
			for (const d of n.dependencies) {
				if (!this.nodes.has(d)) throw D.unknownDependency(tokenDescription(d), tokenDescription(n.token))
			}
		}
		const layers: Token<unknown>[][] = []
		const removed = new Set<Token<unknown>>()
		let progressed = true
		while (removed.size < this.nodes.size && progressed) {
			progressed = false
			const frontier: NodeEntry[] = []
			for (const n of nodes) {
				if (removed.has(n.token)) continue
				const hasUnresolvedDeps = n.dependencies.some(d => !removed.has(d))
				if (!hasUnresolvedDeps) frontier.push(n)
			}
			if (frontier.length > 0) {
				layers.push(frontier.map(n => n.token))
				for (const n of frontier) removed.add(n.token)
				progressed = true
			}
		}
		if (removed.size !== this.nodes.size) throw D.cycleDetected()
		this.layers = layers
		// tracing: emit computed layers once
		this.tracer?.onLayers?.({ layers: layers.map(layer => layer.map(t => tokenDescription(t))) })
		return layers
	}

	private groupByLayerOrder(tokens: ReadonlyArray<Token<unknown>>): Token<unknown>[][] {
		const layerIndex = new Map<Token<unknown>, number>()
		const layers = this.topoLayers()
		layers.forEach((layer, idx) => layer.forEach(tk => layerIndex.set(tk, idx)))
		const groups = new Map<number, Token<unknown>[]>()
		for (const tk of tokens) {
			const idx = layerIndex.get(tk)
			if (idx === undefined) continue
			const arr = groups.get(idx) ?? []
			arr.push(tk)
			groups.set(idx, arr)
		}
		return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]).map(([, arr]) => arr)
	}

	private getNodeEntry(token: Token<unknown>): NodeEntry {
		const n = this.nodes.get(token)
		if (!n) throw D.invariantMissingNode()
		return n
	}

	private getTimeout(token: Token<unknown>, phase: LifecyclePhase): number | undefined {
		const perNode = this.getNodeEntry(token).timeouts
		const fromNode = phase === 'start' ? perNode?.onStart : phase === 'stop' ? perNode?.onStop : perNode?.onDestroy
		const fromDefault = phase === 'start' ? this.defaultTimeouts.onStart : phase === 'stop' ? this.defaultTimeouts.onStop : this.defaultTimeouts.onDestroy
		return fromNode ?? fromDefault
	}

	private now(): number {
		const perfLike = (globalThis as unknown as { performance?: { now: () => number } }).performance
		return typeof perfLike?.now === 'function' ? perfLike.now() : Date.now()
	}

	// Phase runner used by stop/destroy helpers
	private async runPhase(lc: Lifecycle, phase: LifecyclePhase, timeoutMs: number | undefined): Promise<PhaseResult> {
		const t0 = this.now()
		let timedOut = false
		try {
			const p = phase === 'start' ? lc.start() : phase === 'stop' ? lc.stop() : lc.destroy()
			if (typeof timeoutMs === 'number' && timeoutMs > 0) {
				const timeoutPromise = new Promise<never>((_, reject) => {
					const id = setTimeout(() => {
						timedOut = true
						reject(new TimeoutError(phase, timeoutMs))
					}, timeoutMs)
					void Promise.resolve(p).finally(() => clearTimeout(id))
				})
				await Promise.race([p, timeoutPromise]).catch((err) => {
					if (timedOut) {
						// prevent unhandled rejection when the lifecycle promise eventually rejects (e.g., its own hook timeout)
						void Promise.resolve(p).catch(() => {})
					}
					return Promise.reject(err)
				})
			}
			else {
				await p
			}
			const t1 = this.now()
			return { ok: true, durationMs: t1 - t0 }
		}
		catch (e) {
			const t1 = this.now()
			return { ok: false, durationMs: t1 - t0, error: e instanceof Error ? e : new Error(String(e)), timedOut }
		}
	}

	// Concurrency helpers used by start/stop/destroy
	private async runLimited<T>(tasks: readonly Task<T>[]): Promise<T[]> {
		const c = this.concurrency
		const n = typeof c === 'number' && c > 0 ? Math.floor(c) : 0
		if (n === 0 || n >= tasks.length) return Promise.all(tasks.map(fn => fn()))
		const results = new Array<T>(tasks.length)
		let idx = 0
		const workers = Array.from({ length: Math.min(n, tasks.length) }, async () => {
			while (true) {
				const i = idx++
				if (i >= tasks.length) break
				results[i] = await tasks[i]()
			}
		})
		await Promise.all(workers)
		return results
	}

	private async runLayerWithTracing<J>(phase: LifecyclePhase, layerIdxForward: number, jobs: readonly Task<J>[], toOutcome: (j: J) => Outcome | undefined): Promise<J[]> {
		const results = await this.runLimited(jobs)
		const outcomes: Outcome[] = []
		for (const r of results) {
			const out = toOutcome(r)
			if (out) outcomes.push(out)
		}
		if (outcomes.length) this.tracer?.onPhase?.({ phase, layer: layerIdxForward, outcomes })
		return results
	}

	// Stop helper shared by stop() and rollback in start()
	private async stopToken(tk: Token<unknown>, inst: Lifecycle, timeout: number | undefined, context: 'normal' | 'rollback'): Promise<{ outcome: Outcome, error?: LifecycleErrorDetail }> {
		const r = await this.runPhase(inst, 'stop', timeout)
		if (r.ok) {
			this.events?.onComponentStop?.({ token: tk, durationMs: r.durationMs })
			return { outcome: { token: tokenDescription(tk), ok: true, durationMs: r.durationMs } }
		}
		const d = D.makeDetail(tokenDescription(tk), 'stop', context, r)
		this.events?.onComponentError?.(d)
		return { outcome: { token: tokenDescription(tk), ok: false, durationMs: r.durationMs, timedOut: r.timedOut }, error: d }
	}

	// Destroy helper sits immediately before destroy()
	private async destroyToken(tk: Token<unknown>, inst: Lifecycle, stopTimeout: number | undefined, destroyTimeout: number | undefined): Promise<DestroyJobResult> {
		const out: DestroyJobResult = {}
		const localErrors: LifecycleErrorDetail[] = []
		if (inst.state === 'started') {
			const stopped = await this.stopToken(tk, inst, stopTimeout, 'normal')
			out.stopOutcome = stopped.outcome
			if (stopped.error) localErrors.push(stopped.error)
		}
		if (inst.state !== 'destroyed') {
			const r2 = await this.runPhase(inst, 'destroy', destroyTimeout)
			if (r2.ok) {
				this.events?.onComponentDestroy?.({ token: tk, durationMs: r2.durationMs })
				out.destroyOutcome = { token: tokenDescription(tk), ok: true, durationMs: r2.durationMs }
			}
			else {
				const d2 = D.makeDetail(tokenDescription(tk), 'destroy', 'normal', r2)
				this.events?.onComponentError?.(d2)
				out.destroyOutcome = { token: tokenDescription(tk), ok: false, durationMs: r2.durationMs, timedOut: r2.timedOut }
				localErrors.push(d2)
			}
		}
		if (localErrors.length) out.errors = localErrors
		return out
	}
}

export type OrchestratorGetter = {
	(name?: string | symbol): Orchestrator
	set(name: string | symbol, o: Orchestrator, lock?: boolean): void
	clear(name?: string | symbol, force?: boolean): boolean
	list(): (string | symbol)[]
}

const orchestratorRegistry = new Registry<Orchestrator>('orchestrator', new Orchestrator(container()))

export const orchestrator: OrchestratorGetter = Object.assign(
	(name?: string | symbol): Orchestrator => orchestratorRegistry.resolve(name),
	{
		set(name: string | symbol, o: Orchestrator, lock?: boolean) {
			orchestratorRegistry.set(name, o, lock)
		},
		clear(name?: string | symbol, force?: boolean) { return orchestratorRegistry.clear(name, force) },
		list() { return orchestratorRegistry.list() },
	},
)

function normalizeDeps(deps?: Token<unknown>[] | Record<string, Token<unknown>>): Token<unknown>[] {
	if (!deps) return []
	const arr = Array.isArray(deps) ? deps : Object.values(deps)
	const seen = new Set<Token<unknown>>()
	const out: Token<unknown>[] = []
	for (const d of arr) {
		if (!d || seen.has(d)) continue
		seen.add(d)
		out.push(d)
	}
	return out
}

export interface RegisterOptions {
	dependencies?: Token<unknown>[] | Record<string, Token<unknown>>
	timeouts?: PhaseTimeouts
}

// Overloads to preserve inject inference for tuple/object providers
export function register<T, A extends readonly unknown[]>(token: Token<T>, provider: ClassProviderWithTuple<T, A> | FactoryProviderWithTuple<T, A>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T, O extends Record<string, unknown>>(token: Token<T>, provider: FactoryProviderWithObject<T, O>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T>(token: Token<T>, provider: Provider<T>, options: RegisterOptions = {}): OrchestratorRegistration<T> {
	const deps = normalizeDeps(options.dependencies)
	const dependencies = deps.filter(d => d !== token)
	return { token, provider, dependencies, timeouts: options.timeouts }
}

function isPromiseLike(x: unknown): x is PromiseLike<unknown> {
	return typeof x === 'object' && x !== null && 'then' in (x as { then?: unknown }) && typeof (x as { then?: unknown }).then === 'function'
}
