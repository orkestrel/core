import type {
	Token,
	PhaseTimeouts,
	Task,
	PhaseResult,
	Outcome,
	DestroyJobResult,
	OrchestratorOptions,
	NodeEntry,
	OrchestratorGetter,
	LifecycleErrorDetail,
	LifecyclePhase,
	OrchestratorStartResult,
	LifecycleContext,
	LayerPort,
	QueuePort,
	DiagnosticPort,
	LoggerPort,
	OrchestratorGraph,
} from '../types.js';
import { isFunction, isNumber, isRecord } from '@orkestrel/validator';
import {
	tokenDescription,
	safeInvoke,
	isAggregateLifecycleError,
	isAdapterSubclass,
} from '../helpers.js';
import { ContainerAdapter, container } from './container.js';
import { Adapter } from '../adapter.js';
import { RegistryAdapter } from './registry.js';
import { LayerAdapter } from './layer.js';
import { QueueAdapter } from './queue.js';
import { DiagnosticAdapter } from './diagnostic.js';
import { LoggerAdapter } from './logger.js';
import { HELP, ORCHESTRATOR_MESSAGES, LIFECYCLE_MESSAGES, INTERNAL_MESSAGES } from '../constants.js';

/**
 * Deterministic lifecycle runner that starts, stops, and destroys components in dependency order.
 *
 * Responsibilities
 * - Validates dependency graphs (unknown dependencies and cycles are rejected).
 * - Guards providers to ensure synchronous creation (no async factories/values).
 * - Executes lifecycle phases in topological layers with optional concurrency and per-phase timeouts.
 * - Aggregates failures per phase with stable diagnostic codes.
 * - Supports telemetry via events and an optional tracer.
 *
 * @example
 * ```ts
 * import { OrchestratorAdapter, ContainerAdapter, Adapter, createToken } from '@orkestrel/core'
 *
 * class A extends Adapter {}
 * class B extends Adapter {}
 * const TA = createToken<A>('A')
 * const TB = createToken<B>('B')
 *
 * const c = new ContainerAdapter()
 * const app = new OrchestratorAdapter(c)
 * await app.start({
 *   [TA]: { adapter: A },
 *   [TB]: { adapter: B, dependencies: [TA] },
 * })
 * await app.destroy()
 * ```
 */
export class OrchestratorAdapter {
	readonly #container: ContainerAdapter;
	readonly #nodes = new Map<Token<Adapter>, NodeEntry>();
	#layers: Array<Array<Token<Adapter>>> | null = null;
	readonly #timeouts: number | PhaseTimeouts;
	readonly #events?: OrchestratorOptions['events'];
	readonly #tracer?: OrchestratorOptions['tracer'];
	readonly #layer: LayerPort;
	readonly #queue: QueuePort;
	readonly #logger: LoggerPort;
	readonly #diagnostic: DiagnosticPort;

	/**
	 * Construct an OrchestratorAdapter bound to a container and optional runtime ports.
	 *
	 * You can either pass an existing ContainerAdapter, or pass options to construct with a new internal ContainerAdapter using
	 * the same logger/diagnostic by default, or provide both.
	 *
	 * @param containerOrOpts - A ContainerAdapter instance to bind, or OrchestratorOptions to construct a new one.
	 * @param maybeOpts - Optional OrchestratorOptions when the first argument is a ContainerAdapter.
	 *
	 */
	constructor(containerOrOpts?: ContainerAdapter | OrchestratorOptions, maybeOpts?: OrchestratorOptions) {
		if (containerOrOpts instanceof ContainerAdapter) {
			this.#container = containerOrOpts;
			this.#events = maybeOpts?.events;
			this.#tracer = maybeOpts?.tracer;
			this.#timeouts = maybeOpts?.timeouts ?? {};
			this.#logger = maybeOpts?.logger ?? new LoggerAdapter();
			this.#diagnostic = maybeOpts?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: [...ORCHESTRATOR_MESSAGES, ...LIFECYCLE_MESSAGES, ...INTERNAL_MESSAGES] });
			this.#layer = maybeOpts?.layer ?? new LayerAdapter({ logger: this.#logger, diagnostic: this.#diagnostic });
			this.#queue = maybeOpts?.queue ?? new QueueAdapter({ logger: this.#logger, diagnostic: this.#diagnostic });
		}
		else {
			this.#events = containerOrOpts?.events;
			this.#tracer = containerOrOpts?.tracer;
			this.#timeouts = containerOrOpts?.timeouts ?? {};
			this.#logger = containerOrOpts?.logger ?? new LoggerAdapter();
			this.#diagnostic = containerOrOpts?.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: [...ORCHESTRATOR_MESSAGES, ...LIFECYCLE_MESSAGES, ...INTERNAL_MESSAGES] });
			this.#layer = containerOrOpts?.layer ?? new LayerAdapter({ logger: this.#logger, diagnostic: this.#diagnostic });
			this.#queue = containerOrOpts?.queue ?? new QueueAdapter({ logger: this.#logger, diagnostic: this.#diagnostic });
			this.#container = new ContainerAdapter({ logger: this.#logger, diagnostic: this.#diagnostic });
		}
	}

	/**
	 * Access the underlying ContainerAdapter bound to this orchestrator.
	 *
	 * @returns The ContainerAdapter used for provider registration and resolution.
	 */
	get container(): ContainerAdapter { return this.#container; }

	/**
	 * Access the layering adapter used to compute dependency layers.
	 *
	 * @returns The LayerPort responsible for computing and grouping layers.
	 */
	get layer(): LayerPort { return this.#layer; }

	/**
	 * Access the queue adapter used to run per-layer jobs with optional concurrency.
	 *
	 * @returns The QueuePort used to schedule and execute tasks.
	 */
	get queue(): QueuePort { return this.#queue; }

	/**
	 * Access the logger port in use (propagated to internal adapters when not provided).
	 *
	 * @returns The LoggerPort for logging messages.
	 */
	get logger(): LoggerPort { return this.#logger; }

	/**
	 * Access the diagnostic port for logging, metrics, traces, and errors.
	 *
	 * @returns The DiagnosticPort for telemetry and error reporting.
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic; }

	/**
	 * Register Adapter components via an orchestrator graph object.
	 * Keys are tokens, values are AdapterProvider configurations with optional dependencies and timeouts.
	 *
	 * @param graph - Orchestrator graph where keys are tokens and values are AdapterProvider with optional dependencies/timeouts
	 *
	 * @example
	 * ```ts
	 * class A extends Adapter {}
	 * class B extends Adapter {}
	 * const TA = createToken<A>('A')
	 * const TB = createToken<B>('B')
	 * app.register({
	 *   [TA]: { adapter: A },
	 *   [TB]: { adapter: B, dependencies: [TA], timeouts: 5000 },
	 * })
	 * ```
	 */
	register(graph: OrchestratorGraph): void {
		for (const sym of Object.getOwnPropertySymbols(graph)) {
			const token = sym;
			const entry = graph[token];

			if (this.#nodes.has(token)) {
				this.#diagnostic.fail('ORK1007', { scope: 'orchestrator', message: `Duplicate registration for ${tokenDescription(token)}`, helpUrl: HELP.orchestrator });
			}

			const deps = entry.dependencies ?? [];
			const normalized = normalizeDependencies([...deps]).filter(d => d !== token);

			this.#nodes.set(token, { token, dependencies: normalized, timeouts: entry.timeouts });
			this.container.register(token, { adapter: entry.adapter });
			this.#layers = null;
		}
	}

	/**
	 * Start all Adapter components in dependency order.
	 *
	 * @param graph - Optional orchestrator graph where keys are tokens and values are AdapterProvider with optional dependencies/timeouts
	 * @returns A promise that resolves when all start jobs complete or rejects with an aggregated error.
	 *
	 * @example
	 * ```ts
	 * class A extends Adapter {}
	 * class B extends Adapter {}
	 * const TA = createToken<A>('A')
	 * const TB = createToken<B>('B')
	 * await app.start({
	 *   [TA]: { adapter: A },
	 *   [TB]: { adapter: B, dependencies: [TA] },
	 * })
	 * ```
	 */
	async start(graph?: OrchestratorGraph): Promise<void> {
		if (graph) {
			this.register(graph);
		}
		const layers = this.#topoLayers();
		const startedOrder: Array<{ token: Token<Adapter>; lc: Adapter }> = [];
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i];
			const jobs: Array<Task<OrchestratorStartResult>> = [];
			for (const tk of layer) {
				const inst = this.container.get(tk);
				if (inst instanceof Adapter && inst.state === 'created') {
					const timeoutMs = this.#getTimeout(tk, 'start');
					jobs.push(async () => ({ token: tk, lc: inst, result: await this.#runPhase(inst, 'start', timeoutMs) }));
				}
				else if (inst instanceof Adapter && inst.state === 'started') {
					startedOrder.push({ token: tk, lc: inst });
				}
			}
			const results = await this.#runLayerWithTracing('start', i, jobs, ({ token: tkn, result: r }) => ({ token: tokenDescription(tkn), ok: r.ok, durationMs: r.durationMs, timedOut: r.ok ? undefined : r.timedOut }));
			const failures: LifecycleErrorDetail[] = [];
			const successes: Array<{ token: Token<Adapter>; lc: Adapter; durationMs: number }> = [];
			for (const { token: tkn, lc, result: r } of results) {
				if (r.ok) {
					successes.push({ token: tkn, lc, durationMs: r.durationMs });
					safeInvoke(this.#events?.onComponentStart, { token: tkn, durationMs: r.durationMs });
					safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'orchestrator.component.start', { token: tokenDescription(tkn), durationMs: r.durationMs });
				}
				else {
					const detail: LifecycleErrorDetail = { tokenDescription: tokenDescription(tkn), phase: 'start', context: 'normal', timedOut: r.timedOut ?? false, durationMs: r.durationMs, error: r.error };
					failures.push(detail);
					safeInvoke(this.#events?.onComponentError, detail);
					safeInvoke(this.#diagnostic.error.bind(this.#diagnostic), detail.error, { scope: 'orchestrator', token: detail.tokenDescription, phase: 'start', timedOut: detail.timedOut, durationMs: detail.durationMs, extra: { original: detail.error, originalMessage: detail.error.message, originalStack: detail.error.stack } });
				}
			}
			if (failures.length > 0) {
				const toStop = [...startedOrder, ...successes].reverse();
				const rollbackErrors: LifecycleErrorDetail[] = [];
				for (const batch of this.#groupByLayerOrder(toStop.map(x => x.token))) {
					const stopJobs: Array<Task<{ outcome: Outcome; error?: LifecycleErrorDetail }>> = [];
					for (const tk of batch) {
						const lc2 = this.container.get(tk);
						if (lc2 instanceof Adapter && lc2.state === 'started') {
							const timeoutMs = this.#getTimeout(tk, 'stop');
							stopJobs.push(async () => this.#stopToken(tk, lc2, timeoutMs, 'rollback'));
						}
					}
					const settled = await this.#queue.run(stopJobs);
					for (const s of settled) if (s.error) rollbackErrors.push(s.error);
				}
				const aggDetails = [...failures, ...rollbackErrors];
				this.#diagnostic.aggregate('ORK1013', aggDetails, { scope: 'orchestrator', message: 'Errors during start', helpUrl: HELP.errors });
			}
			for (const s of successes) startedOrder.push({ token: s.token, lc: s.lc });
		}
	}

	/**
	 * Stop started components in reverse dependency order.
	 * Aggregates ORK1014 on failure.
	 *
	 * @returns A promise that resolves when stop completes across all components.
	 *
	 * @example
	 * ```ts
	 * const app = new OrchestratorAdapter(new ContainerAdapter())
	 * await app.stop()
	 * ```
	 */
	async stop(): Promise<void> {
		const forwardLayers = this.#topoLayers();
		const layers = forwardLayers.slice().reverse();
		const errors: LifecycleErrorDetail[] = [];
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i];
			const jobs: Array<Task<{ outcome: Outcome; error?: LifecycleErrorDetail }>> = [];
			for (const tk of layer) {
				const inst = this.container.get(tk);
				if (inst instanceof Adapter && inst.state === 'started') {
					const timeoutMs = this.#getTimeout(tk, 'stop');
					jobs.push(async () => this.#stopToken(tk, inst, timeoutMs, 'normal'));
				}
			}
			const settled = await this.#runLayerWithTracing('stop', forwardLayers.length - 1 - i, jobs, ({ outcome }) => outcome);
			for (const s of settled) if (s.error) errors.push(s.error);
		}
		if (errors.length) {
			this.#diagnostic.aggregate('ORK1014', errors, { scope: 'orchestrator', message: 'Errors during stop', helpUrl: HELP.errors });
		}
	}

	/**
	 * Stop (when needed) and destroy all components, then destroy the container.
	 * Aggregates ORK1017 on failure and includes container cleanup errors.
	 *
	 * @returns A promise that resolves when all components and the container are destroyed.
	 *
	 * @example
	 * ```ts
	 * await app.destroy()
	 * ```
	 */
	async destroy(): Promise<void> {
		const forwardLayers = this.#topoLayers();
		const layers = forwardLayers.slice().reverse();
		const errors: LifecycleErrorDetail[] = [];
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i];
			const stopOutcomes: Outcome[] = [];
			const destroyOutcomes: Outcome[] = [];
			const jobs: Array<Task<DestroyJobResult>> = [];
			for (const tk of layer) {
				const inst = this.container.get(tk);
				if (!(inst instanceof Adapter)) continue;
				if (inst.state === 'destroyed') continue;
				const stopTimeout = this.#getTimeout(tk, 'stop');
				const destroyTimeout = this.#getTimeout(tk, 'destroy');
				jobs.push(async () => this.#destroyToken(tk, inst, stopTimeout, destroyTimeout));
			}
			const settled = await this.#queue.run(jobs);
			for (const r of settled) {
				if (r.stopOutcome) stopOutcomes.push(r.stopOutcome);
				if (r.destroyOutcome) destroyOutcomes.push(r.destroyOutcome);
				if (r.errors) errors.push(...r.errors);
			}
			const layerIdx = forwardLayers.length - 1 - i;
			if (stopOutcomes.length) safeInvoke(this.#tracer?.onPhase, { phase: 'stop', layer: layerIdx, outcomes: stopOutcomes });
			if (destroyOutcomes.length) safeInvoke(this.#tracer?.onPhase, { phase: 'destroy', layer: layerIdx, outcomes: destroyOutcomes });
			safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'orchestrator.phase', { phase: 'stop', layer: layerIdx, outcomes: stopOutcomes.length ? stopOutcomes : undefined });
			safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'orchestrator.phase', { phase: 'destroy', layer: layerIdx, outcomes: destroyOutcomes.length ? destroyOutcomes : undefined });
		}
		try {
			await this.container.destroy();
		}
		catch (e) {
			if (isAggregateLifecycleError(e)) {
				errors.push(...e.details);
			}
			else if (e instanceof Error) {
				errors.push({ tokenDescription: 'container', phase: 'destroy', context: 'container', timedOut: false, durationMs: 0, error: e });
			}
		}
		if (errors.length) {
			this.#diagnostic.aggregate('ORK1017', errors, { scope: 'orchestrator', message: 'Errors during destroy', helpUrl: HELP.errors });
		}
	}

	#topoLayers(): Array<Array<Token<Adapter>>> {
		if (this.#layers) return this.#layers;
		const nodes = Array.from(this.#nodes.values());
		const layers = this.#layer.compute(nodes);
		this.#layers = layers;
		safeInvoke(this.#tracer?.onLayers, { layers: layers.map(layer => layer.map(t => tokenDescription(t))) });
		safeInvoke(this.#diagnostic.trace.bind(this.#diagnostic), 'orchestrator.layers', { layers: layers.map(layer => layer.map(t => tokenDescription(t))) });
		return layers;
	}

	#groupByLayerOrder(tokens: ReadonlyArray<Token<Adapter>>): Array<Array<Token<Adapter>>> {
		const layers = this.#topoLayers();
		return this.#layer.group(tokens, layers);
	}

	#getNodeEntry(token: Token<Adapter>): NodeEntry {
		const n = this.#nodes.get(token);
		if (!n) {
			this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: missing node entry' });
		}
		return n;
	}

	#getTimeout(token: Token<Adapter>, phase: LifecyclePhase): number | undefined {
		const perNode = this.#getNodeEntry(token).timeouts;
		let fromNode: number | undefined;
		if (typeof perNode === 'number') {
			fromNode = perNode;
		}
		else {
			fromNode = phase === 'start' ? perNode?.onStart : phase === 'stop' ? perNode?.onStop : perNode?.onDestroy;
		}
		const d = this.#timeouts;
		let fromDefault: number | undefined;
		if (typeof d === 'number') {
			fromDefault = d;
		}
		else {
			fromDefault = phase === 'start' ? d.onStart : phase === 'stop' ? d.onStop : d.onDestroy;
		}
		return fromNode ?? fromDefault;
	}

	#now(): number {
		const g: unknown = globalThis;
		if (isRecord(g) && 'performance' in g && isRecord(g.performance) && 'now' in g.performance && isFunction(g.performance.now)) {
			const result = g.performance.now();
			return isNumber(result) ? result : Date.now();
		}
		return Date.now();
	}

	async #runPhase(lc: Adapter, phase: LifecyclePhase, timeoutMs: number | undefined): Promise<PhaseResult> {
		const t0 = this.#now();
		let timedOut = false;
		try {
			const ctor = lc.constructor;
			if (!isAdapterSubclass(ctor)) {
				this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: instance constructor is not an AdapterSubclass' });
			}
			const p = phase === 'start' ? ctor.start() : phase === 'stop' ? ctor.stop() : ctor.destroy();
			if (typeof timeoutMs === 'number' && timeoutMs > 0) {
				const timeoutPromise = new Promise<never>((_, reject) => {
					const id = setTimeout(() => {
						timedOut = true;
						const e = this.#diagnostic.help('ORK1021', { scope: 'lifecycle', message: `Lifecycle hook '${phase}' timed out after ${timeoutMs}ms`, name: 'TimeoutError', hook: phase, timedOut: true, durationMs: timeoutMs });
						reject(e);
					}, timeoutMs);
					void Promise.resolve(p).finally(() => clearTimeout(id));
				});
				await Promise.race([p, timeoutPromise]).catch((err: unknown) => {
					if (timedOut) {
						// Swallow unhandled rejection on the already-timed-out promise
						void Promise.resolve(p).catch(() => undefined);
					}
					throw err instanceof Error ? err : new Error(String(err));
				});
			}
			else {
				await p;
			}
			const t1 = this.#now();
			return { ok: true, durationMs: t1 - t0 };
		}
		catch (e) {
			const t1 = this.#now();
			return { ok: false, durationMs: t1 - t0, error: e instanceof Error ? e : new Error(String(e)), timedOut };
		}
	}

	async #runLayerWithTracing<J>(phase: LifecyclePhase, layerIdxForward: number, jobs: ReadonlyArray<Task<J>>, toOutcome: (j: J) => Outcome | undefined): Promise<readonly J[]> {
		const results = await this.#queue.run(jobs);
		const outcomes: Outcome[] = [];
		for (const r of results) {
			const out = toOutcome(r);
			if (out) outcomes.push(out);
		}
		if (outcomes.length) safeInvoke(this.#tracer?.onPhase, { phase, layer: layerIdxForward, outcomes });
		safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'orchestrator.phase', { phase, layer: layerIdxForward, outcomes: outcomes.length ? outcomes : undefined });
		return results;
	}

	async #stopToken(tk: Token<Adapter>, inst: Adapter, timeout: number | undefined, context: LifecycleContext): Promise<{ outcome: Outcome; error?: LifecycleErrorDetail }> {
		const r = await this.#runPhase(inst, 'stop', timeout);
		if (r.ok) {
			safeInvoke(this.#events?.onComponentStop, { token: tk, durationMs: r.durationMs });
			safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'orchestrator.component.stop', { token: tokenDescription(tk), durationMs: r.durationMs, context });
			return { outcome: { token: tokenDescription(tk), ok: true, durationMs: r.durationMs } };
		}
		const d: LifecycleErrorDetail = { tokenDescription: tokenDescription(tk), phase: 'stop', context, timedOut: r.timedOut ?? false, durationMs: r.durationMs, error: r.error };
		safeInvoke(this.#events?.onComponentError, d);
		safeInvoke(this.#diagnostic.error.bind(this.#diagnostic), d.error, { scope: 'orchestrator', token: d.tokenDescription, phase: 'stop', timedOut: d.timedOut, durationMs: d.durationMs, extra: { original: d.error, originalMessage: d.error.message, originalStack: d.error.stack } });
		return { outcome: { token: tokenDescription(tk), ok: false, durationMs: r.durationMs, timedOut: r.timedOut }, error: d };
	}

	async #destroyToken(tk: Token<Adapter>, inst: Adapter, stopTimeout: number | undefined, destroyTimeout: number | undefined): Promise<DestroyJobResult> {
		const out: { stopOutcome?: Outcome; destroyOutcome?: Outcome; errors?: LifecycleErrorDetail[] } = {};
		const localErrors: LifecycleErrorDetail[] = [];
		if (inst.state === 'started') {
			const stopped = await this.#stopToken(tk, inst, stopTimeout, 'normal');
			out.stopOutcome = stopped.outcome;
			if (stopped.error) localErrors.push(stopped.error);
		}
		if (inst.state !== 'destroyed') {
			const r2 = await this.#runPhase(inst, 'destroy', destroyTimeout);
			if (r2.ok) {
				safeInvoke(this.#events?.onComponentDestroy, { token: tk, durationMs: r2.durationMs });
				safeInvoke(this.#diagnostic.event.bind(this.#diagnostic), 'orchestrator.component.destroy', { token: tokenDescription(tk), durationMs: r2.durationMs });
				out.destroyOutcome = { token: tokenDescription(tk), ok: true, durationMs: r2.durationMs };
			}
			else {
				const d2: LifecycleErrorDetail = { tokenDescription: tokenDescription(tk), phase: 'destroy', context: 'normal', timedOut: r2.timedOut ?? false, durationMs: r2.durationMs, error: r2.error };
				safeInvoke(this.#events?.onComponentError, d2);
				safeInvoke(this.#diagnostic.error.bind(this.#diagnostic), d2.error, { scope: 'orchestrator', token: d2.tokenDescription, phase: 'destroy', timedOut: d2.timedOut, durationMs: d2.durationMs, extra: { original: d2.error, originalMessage: d2.error.message, originalStack: d2.error.stack } });
				out.destroyOutcome = { token: tokenDescription(tk), ok: false, durationMs: r2.durationMs, timedOut: r2.timedOut };
				localErrors.push(d2);
			}
		}
		if (localErrors.length) out.errors = localErrors;
		return out;
	}
}

const orchestratorRegistry = new RegistryAdapter<OrchestratorAdapter>({ label: 'orchestrator', default: { value: new OrchestratorAdapter(container()) } });

/**
 * Global orchestrator getter.
 *
 * @example
 * ```ts
 * import { orchestrator, createToken, ContainerAdapter } from '@orkestrel/core'
 *
 * const app = orchestrator()
 * const T = createToken<number>('val')
 * await app.container.using(scope => scope.set(T, 7))
 * ```
 */
export const orchestrator = Object.assign(
	(name?: string | symbol): OrchestratorAdapter => orchestratorRegistry.resolve(name),
	{
		set(name: string | symbol, app: OrchestratorAdapter, lock?: boolean) { orchestratorRegistry.set(name, app, lock); },
		clear(name?: string | symbol, force?: boolean) { return orchestratorRegistry.clear(name, force); },
		list() { return [...orchestratorRegistry.list()]; },
		using: orchestratorUsing,
	},
) satisfies OrchestratorGetter;

function orchestratorUsing(fn: (app: OrchestratorAdapter) => void | Promise<void>, name?: string | symbol): Promise<void>;
function orchestratorUsing<T>(fn: (app: OrchestratorAdapter) => T | Promise<T>, name?: string | symbol): Promise<T>;
function orchestratorUsing<T>(apply: (app: OrchestratorAdapter) => void | Promise<void>, fn: (app: OrchestratorAdapter) => T | Promise<T>, name?: string | symbol): Promise<T>;
function orchestratorUsing(
	arg1: ((app: OrchestratorAdapter) => unknown) | ((app: OrchestratorAdapter) => Promise<unknown>),
	arg2?: ((app: OrchestratorAdapter) => unknown) | ((app: OrchestratorAdapter) => Promise<unknown>) | (string | symbol),
	arg3?: string | symbol,
): Promise<unknown> {
	const app = orchestratorRegistry.resolve(typeof arg2 === 'function' ? arg3 : arg2);
	if (typeof arg2 === 'function') {
		return app.container.using(
			async () => {
				await arg1(app);
			},
			() => arg2(app),
		);
	}
	return app.container.using(() => arg1(app));
}

function normalizeDependencies(deps?: Array<Token<Adapter>> | Record<string, Token<Adapter>>): Array<Token<Adapter>> {
	if (!deps) return [];
	const arr = Array.isArray(deps) ? deps : Object.values(deps);
	const seen = new Set<Token<Adapter>>();
	const out: Array<Token<Adapter>> = [];
	for (const d of arr) {
		if (!d || seen.has(d)) continue;
		seen.add(d);
		out.push(d);
	}
	return out;
}


