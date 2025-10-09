import type {
	ClassProviderNoDeps,
	ClassProviderWithTuple,
	ClassProviderWithObject,
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
	DiagnosticPort,
	LoggerPort,
} from './types.js'
import {
	isFactoryProvider,
	isValueProvider,
	isPromiseLike,
	isAsyncFunction,
	isFactoryProviderWithObject,
	isFactoryProviderWithTuple,
	isFactoryProviderNoDeps,
	isFactoryProviderWithContainer,
	tokenDescription,
	safeInvoke,
	hasSchema,
	arrayOf,
	isLifecycleErrorDetail,
	isRawProviderValue,
	isClassProvider,
	isClassProviderWithTuple,
	isClassProviderWithObject,
	isClassProviderWithContainer,
	isClassProviderNoDeps,
} from './helpers.js'
import { Container, container } from './container.js'
import { Lifecycle } from './lifecycle.js'
import { RegistryAdapter } from './adapters/registry.js'
import { LayerAdapter } from './adapters/layer.js'
import { QueueAdapter } from './adapters/queue.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import { LoggerAdapter } from './adapters/logger.js'
import { HELP, ORCHESTRATOR_MESSAGES, LIFECYCLE_MESSAGES, INTERNAL_MESSAGES } from './constants.js'

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
	private readonly timeouts: number | PhaseTimeouts
	private readonly events?: OrchestratorOptions['events']
	private readonly tracer?: OrchestratorOptions['tracer']
	readonly #layer: LayerPort
	readonly #queue: QueuePort
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

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
			this.timeouts = maybeOpts?.timeouts ?? {}
			this.#logger = maybeOpts?.logger ?? new LoggerAdapter()
			this.#diagnostic = maybeOpts?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: [...ORCHESTRATOR_MESSAGES, ...LIFECYCLE_MESSAGES, ...INTERNAL_MESSAGES] })
			this.#layer = maybeOpts?.layer ?? new LayerAdapter({ logger: this.#logger, diagnostic: this.#diagnostic })
			this.#queue = maybeOpts?.queue ?? new QueueAdapter({ logger: this.#logger, diagnostic: this.#diagnostic })
		}
		else {
			this.events = containerOrOpts?.events
			this.tracer = containerOrOpts?.tracer
			this.timeouts = containerOrOpts?.timeouts ?? {}
			this.#logger = containerOrOpts?.logger ?? new LoggerAdapter()
			this.#diagnostic = containerOrOpts?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: [...ORCHESTRATOR_MESSAGES, ...LIFECYCLE_MESSAGES, ...INTERNAL_MESSAGES] })
			this.#layer = containerOrOpts?.layer ?? new LayerAdapter({ logger: this.#logger, diagnostic: this.#diagnostic })
			this.#queue = containerOrOpts?.queue ?? new QueueAdapter({ logger: this.#logger, diagnostic: this.#diagnostic })
			// Ensure the internal container uses the same logger/diagnostic so components inherit them
			this.#container = new Container({ logger: this.#logger, diagnostic: this.#diagnostic })
		}
	}

	// Public API
	/** Get the underlying Container bound to this orchestrator. */
	get container(): Container { return this.#container }
	get layer(): LayerPort { return this.#layer }
	get queue(): QueuePort { return this.#queue }
	get logger(): LoggerPort { return this.#logger }
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/**
	 * Register a component provider with optional explicit dependencies/timeouts.
	 * Throws on duplicate registrations or async provider shapes.
	 */
	register<T>(token: Token<T>, provider: Provider<T>, dependencies: readonly Token<unknown>[] = [], timeouts?: PhaseTimeouts): void {
		if (this.nodes.has(token)) {
			this.#diagnostic.fail('ORK1007', { scope: 'orchestrator', message: `Duplicate registration for ${tokenDescription(token)}`, helpUrl: HELP.orchestrator })
		}
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
			if (this.nodes.has(e.token)) {
				this.#diagnostic.fail('ORK1007', { scope: 'orchestrator', message: `Duplicate registration for ${tokenDescription(e.token)}`, helpUrl: HELP.orchestrator })
			}
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
					safeInvoke(this.events?.onComponentStart, { token: tkn, durationMs: r.durationMs })
					// success path diagnostic event
					safeInvoke(this.diagnostic.event.bind(this.diagnostic), 'orchestrator.component.start', { token: tokenDescription(tkn), durationMs: r.durationMs })
				}
				else {
					const detail: LifecycleErrorDetail = { tokenDescription: tokenDescription(tkn), phase: 'start', context: 'normal', timedOut: r.timedOut ?? false, durationMs: r.durationMs, error: r.error }
					failures.push(detail)
					safeInvoke(this.events?.onComponentError, detail)
					// failure path diagnostic error
					safeInvoke(this.diagnostic.error.bind(this.diagnostic), detail.error, { scope: 'orchestrator', token: detail.tokenDescription, phase: 'start', timedOut: detail.timedOut, durationMs: detail.durationMs, extra: { original: detail.error, originalMessage: detail.error.message, originalStack: detail.error.stack } })
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
					const settled = await this.queue.run(stopJobs)
					for (const s of settled) if (s.error) rollbackErrors.push(s.error)
				}
				const aggDetails = [...failures, ...rollbackErrors]
				this.#diagnostic.aggregate('ORK1013', aggDetails, { scope: 'orchestrator', message: 'Errors during start', helpUrl: HELP.errors })
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
			this.#diagnostic.aggregate('ORK1014', errors, { scope: 'orchestrator', message: 'Errors during stop', helpUrl: HELP.errors })
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
			const settled = await this.queue.run(jobs)
			for (const r of settled) {
				if (r.stopOutcome) stopOutcomes.push(r.stopOutcome)
				if (r.destroyOutcome) destroyOutcomes.push(r.destroyOutcome)
				if (r.errors) errors.push(...r.errors)
			}
			const layerIdx = forwardLayers.length - 1 - i
			if (stopOutcomes.length) safeInvoke(this.tracer?.onPhase, { phase: 'stop', layer: layerIdx, outcomes: stopOutcomes })
			if (destroyOutcomes.length) safeInvoke(this.tracer?.onPhase, { phase: 'destroy', layer: layerIdx, outcomes: destroyOutcomes })
			// diagnostics for phases guarded
			safeInvoke(this.diagnostic.event.bind(this.diagnostic), 'orchestrator.phase', { phase: 'stop', layer: layerIdx, outcomes: stopOutcomes.length ? stopOutcomes : undefined })
			safeInvoke(this.diagnostic.event.bind(this.diagnostic), 'orchestrator.phase', { phase: 'destroy', layer: layerIdx, outcomes: destroyOutcomes.length ? destroyOutcomes : undefined })
		}
		try {
			await this.container.destroy()
		}
		catch (e) {
			if (hasSchema(e, { details: arrayOf(isLifecycleErrorDetail) })) {
				errors.push(...e.details)
			}
			else if (e instanceof Error) {
				errors.push({ tokenDescription: 'container', phase: 'destroy', context: 'container', timedOut: false, durationMs: 0, error: e })
			}
		}
		if (errors.length) {
			this.#diagnostic.aggregate('ORK1017', errors, { scope: 'orchestrator', message: 'Errors during destroy', helpUrl: HELP.errors })
		}
	}

	// ---------------------------
	// Internals (helpers)
	// ---------------------------

	// Provider guard adjacent to register
	private guardProvider<T>(token: Token<T>, provider: Provider<T>): Provider<T> {
		const desc = tokenDescription(token)
		// Raw value first – disallow Promise-like values
		if (isRawProviderValue(provider)) {
			if (isPromiseLike(provider)) {
				this.#diagnostic.fail('ORK1010', { scope: 'orchestrator', message: `Async providers are not supported: token '${desc}' was registered with a Promise value. Move async work into Lifecycle.onStart or pre-resolve the value before registration.`, helpUrl: HELP.providers })
			}
			return provider
		}
		// value provider
		if (isValueProvider(provider)) {
			const v = provider.useValue
			if (isPromiseLike(v)) {
				this.#diagnostic.fail('ORK1010', { scope: 'orchestrator', message: `Async providers are not supported: token '${desc}' was registered with useValue that is a Promise. Move async work into Lifecycle.onStart or pre-resolve the value before registration.`, helpUrl: HELP.providers })
			}
			return provider
		}
		// factory providers
		if (isFactoryProvider(provider)) {
			if (isFactoryProviderWithTuple<T, readonly unknown[]>(provider)) {
				const wrapped = wrapFactory(this.#diagnostic, provider.useFactory, desc)
				return { useFactory: wrapped, inject: provider.inject }
			}
			if (isFactoryProviderWithObject<T>(provider)) {
				const wrapped = wrapFactory(this.#diagnostic, provider.useFactory, desc)
				return { useFactory: wrapped, inject: provider.inject }
			}
			if (isFactoryProviderWithContainer<T>(provider)) {
				const wrapped = wrapFactory(this.#diagnostic, provider.useFactory, desc)
				return { useFactory: wrapped }
			}
			if (isFactoryProviderNoDeps<T>(provider)) {
				const wrapped = wrapFactory(this.#diagnostic, provider.useFactory, desc)
				return { useFactory: wrapped }
			}
		}
		// class providers – currently no async hazard to wrap; just verify known shapes
		if (isClassProvider(provider)) {
			if (isClassProviderWithTuple<T, readonly unknown[]>(provider)) {
				return { useClass: provider.useClass, inject: provider.inject }
			}
			if (isClassProviderWithObject<T>(provider)) {
				return { useClass: provider.useClass, inject: provider.inject }
			}
			if (isClassProviderWithContainer<T>(provider)) {
				return { useClass: provider.useClass }
			}
			if (isClassProviderNoDeps<T>(provider)) {
				return { useClass: provider.useClass }
			}
		}
		// Fallback invariant: unknown provider shape
		this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: unknown provider shape during guardProvider' })
	}

	// Kahn-style O(V + E) layering with deterministic ordering
	private topoLayers(): Token<unknown>[][] {
		if (this.layers) return this.layers
		const nodes = Array.from(this.nodes.values())
		const layers = this.layer.compute(nodes)
		this.layers = layers
		// tracing: emit computed layers once (guarded)
		safeInvoke(this.tracer?.onLayers, { layers: layers.map(layer => layer.map(t => tokenDescription(t))) })
		// diagnostic trace guarded
		safeInvoke(this.diagnostic.trace.bind(this.diagnostic), 'orchestrator.layers', { layers: layers.map(layer => layer.map(t => tokenDescription(t))) })
		return layers
	}

	private groupByLayerOrder(tokens: ReadonlyArray<Token<unknown>>): Token<unknown>[][] {
		const layers = this.topoLayers()
		return this.layer.group(tokens, layers)
	}

	private getNodeEntry(token: Token<unknown>): NodeEntry {
		const n = this.nodes.get(token)
		if (!n) {
			this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: missing node entry' })
		}
		return n
	}

	private getTimeout(token: Token<unknown>, phase: LifecyclePhase): number | undefined {
		const perNode = this.getNodeEntry(token).timeouts
		let fromNode: number | undefined
		if (typeof perNode === 'number') {
			fromNode = perNode
		}
		else {
			fromNode = phase === 'start' ? perNode?.onStart : phase === 'stop' ? perNode?.onStop : perNode?.onDestroy
		}
		const d = this.timeouts
		let fromDefault: number | undefined
		if (typeof d === 'number') {
			fromDefault = d
		}
		else {
			fromDefault = phase === 'start' ? d.onStart : phase === 'stop' ? d.onStop : d.onDestroy
		}
		return fromNode ?? fromDefault
	}

	private now(): number {
		const g: unknown = globalThis
		if (hasSchema(g, { performance: { now: (v: unknown): v is () => number => typeof v === 'function' } })) {
			return g.performance.now()
		}
		return Date.now()
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
						const e = this.#diagnostic.help('ORK1021', { scope: 'lifecycle', message: `Lifecycle hook '${phase}' timed out after ${timeoutMs}ms`, name: 'TimeoutError', hook: phase, timedOut: true, durationMs: timeoutMs })
						reject(e)
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
		const results = await this.queue.run(jobs)
		const outcomes: Outcome[] = []
		for (const r of results) {
			const out = toOutcome(r)
			if (out) outcomes.push(out)
		}
		if (outcomes.length) safeInvoke(this.tracer?.onPhase, { phase, layer: layerIdxForward, outcomes })
		// diagnostic event guarded
		safeInvoke(this.diagnostic.event.bind(this.diagnostic), 'orchestrator.phase', { phase, layer: layerIdxForward, outcomes: outcomes.length ? outcomes : undefined })
		return results
	}

	// Stop helper shared by stop() and rollback in start()
	private async stopToken(tk: Token<unknown>, inst: Lifecycle, timeout: number | undefined, context: LifecycleContext): Promise<{ outcome: Outcome, error?: LifecycleErrorDetail }> {
		const r = await this.runPhase(inst, 'stop', timeout)
		if (r.ok) {
			safeInvoke(this.events?.onComponentStop, { token: tk, durationMs: r.durationMs })
			safeInvoke(this.diagnostic.event.bind(this.diagnostic), 'orchestrator.component.stop', { token: tokenDescription(tk), durationMs: r.durationMs, context })
			return { outcome: { token: tokenDescription(tk), ok: true, durationMs: r.durationMs } }
		}
		const d: LifecycleErrorDetail = { tokenDescription: tokenDescription(tk), phase: 'stop', context, timedOut: r.timedOut ?? false, durationMs: r.durationMs, error: r.error }
		safeInvoke(this.events?.onComponentError, d)
		safeInvoke(this.diagnostic.error.bind(this.diagnostic), d.error, { scope: 'orchestrator', token: d.tokenDescription, phase: 'stop', timedOut: d.timedOut, durationMs: d.durationMs, extra: { original: d.error, originalMessage: d.error.message, originalStack: d.error.stack } })
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
				safeInvoke(this.events?.onComponentDestroy, { token: tk, durationMs: r2.durationMs })
				safeInvoke(this.diagnostic.event.bind(this.diagnostic), 'orchestrator.component.destroy', { token: tokenDescription(tk), durationMs: r2.durationMs })
				out.destroyOutcome = { token: tokenDescription(tk), ok: true, durationMs: r2.durationMs }
			}
			else {
				const d2: LifecycleErrorDetail = { tokenDescription: tokenDescription(tk), phase: 'destroy', context: 'normal', timedOut: r2.timedOut ?? false, durationMs: r2.durationMs, error: r2.error }
				safeInvoke(this.events?.onComponentError, d2)
				safeInvoke(this.diagnostic.error.bind(this.diagnostic), d2.error, { scope: 'orchestrator', token: d2.tokenDescription, phase: 'destroy', timedOut: d2.timedOut, durationMs: d2.durationMs, extra: { original: d2.error, originalMessage: d2.error.message, originalStack: d2.error.stack } })
				out.destroyOutcome = { token: tokenDescription(tk), ok: false, durationMs: r2.durationMs, timedOut: r2.timedOut }
				localErrors.push(d2)
			}
		}
		if (localErrors.length) out.errors = localErrors
		return out
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

export const orchestrator = Object.assign(
	(name?: string | symbol): Orchestrator => orchestratorRegistry.resolve(name),
	{
		set(name: string | symbol, app: Orchestrator, lock?: boolean) { orchestratorRegistry.set(name, app, lock) },
		clear(name?: string | symbol, force?: boolean) { return orchestratorRegistry.clear(name, force) },
		list() { return [...orchestratorRegistry.list()] },
		using: orchestratorUsing,
	},
) satisfies OrchestratorGetter

function orchestratorUsing(fn: (app: Orchestrator) => void | Promise<void>, name?: string | symbol): Promise<void>
function orchestratorUsing<T>(fn: (app: Orchestrator) => T | Promise<T>, name?: string | symbol): Promise<T>
function orchestratorUsing<T>(apply: (app: Orchestrator) => void | Promise<void>, fn: (app: Orchestrator) => T | Promise<T>, name?: string | symbol): Promise<T>
function orchestratorUsing(
	arg1: ((app: Orchestrator) => unknown) | ((app: Orchestrator) => Promise<unknown>),
	arg2?: ((app: Orchestrator) => unknown) | ((app: Orchestrator) => Promise<unknown>) | (string | symbol),
	arg3?: string | symbol,
): Promise<unknown> {
	const app = orchestratorRegistry.resolve(typeof arg2 === 'function' ? arg3 : arg2)
	if (typeof arg2 === 'function') {
		return app.container.using(
			async () => {
				await arg1(app)
			},
			() => arg2(app),
		)
	}
	return app.container.using(() => arg1(app))
}

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
export function register<T, O extends Record<string, unknown>>(token: Token<T>, provider: ClassProviderWithObject<T, O> | FactoryProviderWithObject<T, O>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, options?: RegisterOptions): OrchestratorRegistration<T>
export function register<T>(token: Token<T>, provider: Provider<T>, options: RegisterOptions = {}): OrchestratorRegistration<T> {
	const deps = normalizeDeps(options.dependencies)
	const dependencies = deps.filter(d => d !== token)
	return { token, provider, dependencies, timeouts: options.timeouts }
}

/* ---------------------------
   Provider guard helpers (strict, eslint-safe)
--------------------------- */

function wrapFactory<R>(diag: DiagnosticPort, fn: () => R, tokenDesc: string): () => R
function wrapFactory<R>(diag: DiagnosticPort, fn: (c: Container) => R, tokenDesc: string): (c: Container) => R
function wrapFactory<A extends readonly unknown[], R>(diag: DiagnosticPort, fn: (...args: A) => R, tokenDesc: string): (...args: A) => R
function wrapFactory<A extends readonly unknown[], R>(diag: DiagnosticPort, fn: (...args: A) => R, tokenDesc: string): (...args: A) => R {
	// disallow async functions immediately
	if (isAsyncFunction(fn)) {
		diag.fail('ORK1011', { scope: 'orchestrator', message: `Async providers are not supported: useFactory for token '${tokenDesc}' is an async function. Factories must be synchronous. Move async work into Lifecycle.onStart or pre-resolve the value.`, helpUrl: HELP.providers })
	}
	return (...args: A): R => {
		const out = fn(...args)
		if (isPromiseLike(out)) {
			diag.fail('ORK1012', { scope: 'orchestrator', message: `Async providers are not supported: useFactory for token '${tokenDesc}' returned a Promise. Factories must be synchronous. Move async work into Lifecycle.onStart or pre-resolve the value.`, helpUrl: HELP.providers })
		}
		return out
	}
}
