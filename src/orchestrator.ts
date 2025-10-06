import type {
	ClassProviderNoDeps,
	ClassProviderWithTuple,
	FactoryProviderNoDeps,
	FactoryProviderWithObject,
	FactoryProviderWithTuple,
	Provider,
	Token,
	ValueProvider,
	PhaseTimeouts,
	Task,
	PhaseResult,
	Outcome,
	DestroyJobResult,
	OrchestratorRegistration,
	OrchestratorOptions,
	NodeEntry,
	RegisterOptions,
	OrchestratorGetter,
	LifecycleErrorDetail,
	LifecyclePhase,
	OrchestratorStartResult,
	LifecycleContext,
	LayerPort,
	QueuePort,
} from './types.js'
import {
	isFactoryProvider,
	isValueProvider,
	isPromiseLike,
	isAsyncFunction,
	isFactoryProviderWithObject,
	isFactoryProviderWithTuple,
	isFactoryProviderNoDeps,
	isZeroArg,
} from './types.js'
import { Container, container } from './container.js'
import { Lifecycle } from './lifecycle.js'
import { RegistryAdapter } from './adapters/registry.js'
import { AggregateLifecycleError, D, TimeoutError, tokenDescription } from './diagnostics.js'
import { LayerAdapter } from './adapters/layer.js'
import { QueueAdapter } from './adapters/queue.js'

/**
 * Deterministic lifecycle runner that starts, stops, and destroys components in dependency order.
 *
 * - Enforces async provider guards at registration time.
 * - Aggregates errors per phase with stable diagnostics codes.
 * - Supports telemetry via events and optional debug tracing of layers/phases.
 */
export class Orchestrator {
	readonly #container: Container
	private readonly nodes = new Map<Token<unknown>, NodeEntry>()
	private layers: Token<unknown>[][] | null = null
	private readonly defaultTimeouts: PhaseTimeouts
	private readonly events?: OrchestratorOptions['events']
	private readonly tracer?: OrchestratorOptions['tracer']
	private readonly concurrency?: number
	private readonly layer: LayerPort
	private readonly queue: QueuePort<unknown>

	/**
	 * Construct an Orchestrator.
	 * - Pass a Container to bind to an existing one.
	 * - Or pass options to construct with a new internal Container.
	 * - Or pass both.
	 */
	constructor(containerOrOpts?: Container | OrchestratorOptions, maybeOpts?: OrchestratorOptions) {
		if (containerOrOpts instanceof Container) {
			this.#container = containerOrOpts
			this.events = maybeOpts?.events
			this.tracer = maybeOpts?.tracer
			this.defaultTimeouts = maybeOpts?.defaultTimeouts ?? {}
			this.concurrency = maybeOpts?.concurrency
			this.layer = maybeOpts?.layer ?? new LayerAdapter()
			this.queue = maybeOpts?.queue ?? new QueueAdapter()
		}
		else {
			this.#container = new Container()
			this.events = containerOrOpts?.events
			this.tracer = containerOrOpts?.tracer
			this.defaultTimeouts = containerOrOpts?.defaultTimeouts ?? {}
			this.concurrency = containerOrOpts?.concurrency
			this.layer = containerOrOpts?.layer ?? new LayerAdapter()
			this.queue = containerOrOpts?.queue ?? new QueueAdapter()
		}
	}

	// Public API
	/** Get the underlying Container bound to this orchestrator. */
	get container(): Container { return this.#container }

	/**
	 * Register a component provider with optional explicit dependencies/timeouts.
	 * Throws on duplicate registrations or async provider shapes.
	 */
	register<T>(token: Token<T>, provider: Provider<T>, dependencies: readonly Token<unknown>[] = [], timeouts?: PhaseTimeouts): void {
		if (this.nodes.has(token)) throw D.duplicateRegistration(tokenDescription(token))
		const normalized = this.normalizeDependencies(token, dependencies)
		this.nodes.set(token, { token, dependencies: normalized, timeouts })
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
			const deps = this.normalizeDependencies(e.token, e.dependencies ?? [])
			if (this.nodes.has(e.token)) throw D.duplicateRegistration(tokenDescription(e.token))
			this.nodes.set(e.token, { token: e.token, dependencies: deps, timeouts: e.timeouts })
			const guarded = this.guardProvider(e.token, e.provider)
			this.container.register(e.token, guarded)
		}
		this.layers = null
		// Start all components in dependency order (previously startAll)
		const layers = this.topoLayers()
		const startedOrder: { token: Token<unknown>, lc: Lifecycle }[] = []
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			type StartResult = OrchestratorStartResult
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
			const results = await this.runLayerWithTracing('start', i, jobs, ({ token: tkn, result: r }) => ({ token: tokenDescription(tkn), ok: r.ok, durationMs: r.durationMs, timedOut: r.ok ? undefined : r.timedOut }))
			const failures: LifecycleErrorDetail[] = []
			const successes: { token: Token<unknown>, lc: Lifecycle, durationMs: number }[] = []
			for (const { token: tkn, lc, result: r } of results) {
				if (r.ok) {
					successes.push({ token: tkn, lc, durationMs: r.durationMs })
					this.safeCall(this.events?.onComponentStart, { token: tkn, durationMs: r.durationMs })
				}
				else {
					const detail = D.makeDetail(tokenDescription(tkn), 'start', 'normal', r)
					failures.push(detail)
					this.safeCall(this.events?.onComponentError, detail)
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
					const settled = await this.queue.run(stopJobs, { concurrency: this.concurrency })
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
			const settled = await this.queue.run(jobs, { concurrency: this.concurrency })
			for (const r of settled) {
				if (r.stopOutcome) stopOutcomes.push(r.stopOutcome)
				if (r.destroyOutcome) destroyOutcomes.push(r.destroyOutcome)
				if (r.errors) errors.push(...r.errors)
			}
			const layerIdx = forwardLayers.length - 1 - i
			if (stopOutcomes.length) this.safeCall(this.tracer?.onPhase, { phase: 'stop', layer: layerIdx, outcomes: stopOutcomes })
			if (destroyOutcomes.length) this.safeCall(this.tracer?.onPhase, { phase: 'destroy', layer: layerIdx, outcomes: destroyOutcomes })
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
			if (isPromiseLike(v)) throw D.asyncUseValuePromise(tokenDescription(token))
			return provider
		}
		if (isFactoryProvider(provider)) {
			const desc = tokenDescription(token)
			// Wrap useFactory variant to assert sync-only behavior while preserving original signatures
			if (isFactoryProviderWithTuple<T, readonly unknown[]>(provider)) {
				const wrapped = wrapFactory(provider.useFactory, desc)
				return { useFactory: wrapped, inject: provider.inject }
			}
			if (isFactoryProviderWithObject<T>(provider)) {
				const wrapped = wrapFactory(provider.useFactory, desc)
				return { useFactory: wrapped, inject: provider.inject }
			}
			if (isFactoryProviderNoDeps<T>(provider)) {
				const uf = provider.useFactory
				if (isZeroArg(uf)) {
					const wrapped = wrapFactory(uf, desc)
					return { useFactory: wrapped }
				}
				const wrapped = wrapFactory(uf, desc)
				return { useFactory: wrapped }
			}
		}
		return provider
	}

	// Kahn-style O(V + E) layering with deterministic ordering
	private topoLayers(): Token<unknown>[][] {
		if (this.layers) return this.layers
		const nodes = Array.from(this.nodes.values())
		const layers = this.layer.compute(nodes)
		this.layers = layers
		// tracing: emit computed layers once (guarded)
		this.safeCall(this.tracer?.onLayers, { layers: layers.map(layer => layer.map(t => tokenDescription(t))) })
		return layers
	}

	private groupByLayerOrder(tokens: ReadonlyArray<Token<unknown>>): Token<unknown>[][] {
		const layers = this.topoLayers()
		return this.layer.group(tokens, layers)
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

	private async runLayerWithTracing<J>(phase: LifecyclePhase, layerIdxForward: number, jobs: ReadonlyArray<Task<J>>, toOutcome: (j: J) => Outcome | undefined): Promise<ReadonlyArray<J>> {
		const results = await this.queue.run(jobs, { concurrency: this.concurrency })
		const outcomes: Outcome[] = []
		for (const r of results) {
			const out = toOutcome(r)
			if (out) outcomes.push(out)
		}
		if (outcomes.length) this.safeCall(this.tracer?.onPhase, { phase, layer: layerIdxForward, outcomes })
		return results
	}

	// Stop helper shared by stop() and rollback in start()
	private async stopToken(tk: Token<unknown>, inst: Lifecycle, timeout: number | undefined, context: LifecycleContext): Promise<{ outcome: Outcome, error?: LifecycleErrorDetail }> {
		const r = await this.runPhase(inst, 'stop', timeout)
		if (r.ok) {
			this.safeCall(this.events?.onComponentStop, { token: tk, durationMs: r.durationMs })
			return { outcome: { token: tokenDescription(tk), ok: true, durationMs: r.durationMs } }
		}
		const d = D.makeDetail(tokenDescription(tk), 'stop', context, r)
		this.safeCall(this.events?.onComponentError, d)
		return { outcome: { token: tokenDescription(tk), ok: false, durationMs: r.durationMs, timedOut: r.timedOut }, error: d }
	}

	// Destroy helper sits immediately before destroy()
	private async destroyToken(tk: Token<unknown>, inst: Lifecycle, stopTimeout: number | undefined, destroyTimeout: number | undefined): Promise<DestroyJobResult> {
		const out: { stopOutcome?: Outcome, destroyOutcome?: Outcome, errors?: LifecycleErrorDetail[] } = {}
		const localErrors: LifecycleErrorDetail[] = []
		if (inst.state === 'started') {
			const stopped = await this.stopToken(tk, inst, stopTimeout, 'normal')
			out.stopOutcome = stopped.outcome
			if (stopped.error) localErrors.push(stopped.error)
		}
		if (inst.state !== 'destroyed') {
			const r2 = await this.runPhase(inst, 'destroy', destroyTimeout)
			if (r2.ok) {
				this.safeCall(this.events?.onComponentDestroy, { token: tk, durationMs: r2.durationMs })
				out.destroyOutcome = { token: tokenDescription(tk), ok: true, durationMs: r2.durationMs }
			}
			else {
				const d2 = D.makeDetail(tokenDescription(tk), 'destroy', 'normal', r2)
				this.safeCall(this.events?.onComponentError, d2)
				out.destroyOutcome = { token: tokenDescription(tk), ok: false, durationMs: r2.durationMs, timedOut: r2.timedOut }
				localErrors.push(d2)
			}
		}
		if (localErrors.length) out.errors = localErrors
		return out
	}

	// ---- small utility helpers (typed and side-effect-safe) ----
	/** Guarded single-argument callback invocation to isolate orchestration from telemetry errors. */
	private safeCall<T>(fn: ((payload: T) => void) | undefined, payload: T): void {
		if (!fn) return
		try {
			fn(payload)
		}
		catch { /* swallow */ }
	}

	/** Dedupe dependencies and remove self-dependency while preserving order. */
	private normalizeDependencies(token: Token<unknown>, dependencies: ReadonlyArray<Token<unknown>>): Token<unknown>[] {
		const seen = new Set<Token<unknown>>()
		const out: Token<unknown>[] = []
		for (const d of dependencies) {
			if (!d || d === token || seen.has(d)) continue
			seen.add(d)
			out.push(d)
		}
		return out
	}
}

const orchestratorRegistry = new RegistryAdapter<Orchestrator>({ label: 'orchestrator', default: { value: new Orchestrator(container()) } })

export const orchestrator: OrchestratorGetter = Object.assign(
	(name?: string | symbol): Orchestrator => orchestratorRegistry.resolve(name),
	{
		set(name: string | symbol, o: Orchestrator, lock?: boolean) {
			orchestratorRegistry.set(name, o, lock)
		},
		clear(name?: string | symbol, force?: boolean) { return orchestratorRegistry.clear(name, force) },
		list() { return [...orchestratorRegistry.list()] },
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

// Overloads to preserve inject inference for tuple/object providers
export function register<T, A extends readonly unknown[]>(token: Token<T>, provider: ClassProviderWithTuple<T, A> | FactoryProviderWithTuple<T, A>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T, O extends Record<string, unknown>>(token: Token<T>, provider: FactoryProviderWithObject<T, O>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T>(token: Token<T>, provider: Provider<T>, options: RegisterOptions = {}): OrchestratorRegistration<T> {
	const deps = normalizeDeps(options.dependencies)
	const dependencies = deps.filter(d => d !== token)
	return { token, provider, dependencies, timeouts: options.timeouts }
}

/* ---------------------------
   Provider guard helpers (strict, eslint-safe)
--------------------------- */

function wrapFactory<A extends readonly unknown[], R>(fn: (...args: A) => R, tokenDesc: string): (...args: A) => R {
	// disallow async functions immediately
	if (isAsyncFunction(fn)) throw D.asyncUseFactoryAsync(tokenDesc)
	return (...args: A): R => {
		const out = fn(...args)
		if (isPromiseLike(out)) throw D.asyncUseFactoryPromise(tokenDesc)
		return out
	}
}
