import type { Provider, Token } from './container.js'
import { Container, isClassProvider, isFactoryProvider, isValueProvider, container } from './container.js'
import { Lifecycle } from './lifecycle.js'
import { Registry } from './registry.js'
import { D, type LifecycleErrorDetail, type LifecyclePhase, AggregateLifecycleError, TimeoutError } from './diagnostics.js'

export interface OrchestratorRegistration<T> {
	token: Token<T>
	provider: Provider<T>
	/** Optional explicit dependencies for this registration */
	dependencies?: Token<unknown>[]
	/** Per-phase timeouts in milliseconds */
	timeouts?: { onStart?: number, onStop?: number, onDestroy?: number }
}

export interface OrchestratorOptions {
	defaultTimeouts?: { onStart?: number, onStop?: number, onDestroy?: number }
	events?: {
		onComponentStart?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentStop?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentDestroy?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentError?: (detail: LifecycleErrorDetail) => void
	}
}

interface NodeEntry { token: Token<unknown>, dependencies: Token<unknown>[], timeouts?: { onStart?: number, onStop?: number, onDestroy?: number } }

export class Orchestrator {
	private readonly container: Container
	private readonly nodes = new Map<symbol, NodeEntry>()
	private layers: Token<unknown>[][] | null = null
	private readonly defaultTimeouts: { onStart?: number, onStop?: number, onDestroy?: number }
	private readonly events?: OrchestratorOptions['events']

	constructor(containerOrOpts?: Container | OrchestratorOptions, maybeOpts?: OrchestratorOptions) {
		if (containerOrOpts instanceof Container) {
			this.container = containerOrOpts
			this.events = maybeOpts?.events
			this.defaultTimeouts = maybeOpts?.defaultTimeouts ?? {}
		}
		else {
			this.container = new Container()
			this.events = containerOrOpts?.events
			this.defaultTimeouts = containerOrOpts?.defaultTimeouts ?? {}
		}
	}

	getContainer(): Container { return this.container }

	register<T>(token: Token<T>, provider: Provider<T>, dependencies: Token<unknown>[] = [], timeouts?: { onStart?: number, onStop?: number, onDestroy?: number }): void {
		if (this.nodes.has(token.key)) throw D.duplicateRegistration(token.description)
		this.nodes.set(token.key, { token: token as Token<unknown>, dependencies, timeouts })
		const guarded = this.guardProvider(token, provider)
		this.container.register(token, guarded)
		this.layers = null
	}

	async start(regs: OrchestratorRegistration<unknown>[] = []): Promise<void> {
		// Register any provided components first
		for (const e of regs) {
			const deps = e.dependencies ?? []
			if (this.nodes.has(e.token.key)) throw D.duplicateRegistration(e.token.description)
			this.nodes.set(e.token.key, { token: e.token as Token<unknown>, dependencies: deps, timeouts: e.timeouts })
			const guarded = this.guardProvider(e.token, e.provider)
			this.container.register(e.token, guarded)
		}
		this.layers = null
		// Start all components in dependency order (previously startAll)
		const layers = this.topoLayers()
		const startedOrder: { token: Token<unknown>, lc: Lifecycle }[] = []
		for (const layer of layers) {
			const tasks: { token: Token<unknown>, lc: Lifecycle, timeoutMs?: number, promise: Promise<{ ok: true, durationMs: number } | { ok: false, durationMs: number, error: Error, timedOut: boolean }> }[] = []
			for (const tk of layer) {
				const inst = this.container.get(tk)
				if (inst instanceof Lifecycle && inst.state === 'created') {
					const timeoutMs = this.getTimeout(tk, 'start')
					tasks.push({ token: tk, lc: inst, timeoutMs, promise: this.runPhase(inst, 'start', timeoutMs) })
				}
				else if (inst instanceof Lifecycle && inst.state === 'started') {
					startedOrder.push({ token: tk, lc: inst })
				}
			}
			const results = await Promise.all(tasks.map(t => t.promise.then(r => ({ t, r }))))
			const failures: LifecycleErrorDetail[] = []
			const successes: { token: Token<unknown>, lc: Lifecycle, durationMs: number }[] = []
			for (const { t, r } of results) {
				if (r.ok) {
					successes.push({ token: t.token, lc: t.lc, durationMs: r.durationMs })
					this.events?.onComponentStart?.({ token: t.token, durationMs: r.durationMs })
				}
				else {
					const detail = D.makeDetail(t.token, 'start', 'normal', r)
					failures.push(detail)
					this.events?.onComponentError?.(detail)
				}
			}
			if (failures.length > 0) {
				const toStop = [...startedOrder, ...successes].reverse()
				const rollbackErrors: LifecycleErrorDetail[] = []
				for (const batch of this.groupByLayerOrder(toStop.map(x => x.token))) {
					const stopTasks: Promise<LifecycleErrorDetail | undefined>[] = []
					for (const tk of batch) {
						const lc2 = this.container.get(tk)
						if (lc2 instanceof Lifecycle && lc2.state === 'started') {
							const timeoutMs = this.getTimeout(tk, 'stop')
							stopTasks.push(this.runPhase(lc2, 'stop', timeoutMs).then((r) => {
								if (!r.ok) {
									const d = D.makeDetail(tk, 'stop', 'rollback', r)
									this.events?.onComponentError?.(d)
									return d
								}
								else {
									this.events?.onComponentStop?.({ token: tk, durationMs: r.durationMs })
								}
							}))
						}
					}
					const settled = await Promise.all(stopTasks)
					for (const d of settled) if (d) rollbackErrors.push(d)
				}
				const agg = D.startAggregate()
				throw new AggregateLifecycleError({ code: agg.code, message: agg.message, helpUrl: agg.helpUrl }, [...failures, ...rollbackErrors])
			}
			for (const s of successes) startedOrder.push({ token: s.token, lc: s.lc })
		}
	}

	private now(): number {
		const perfLike = (globalThis as unknown as { performance?: { now: () => number } }).performance
		return typeof perfLike?.now === 'function' ? perfLike.now() : Date.now()
	}

	private topoLayers(): Token<unknown>[][] {
		if (this.layers) return this.layers
		const nodes = Array.from(this.nodes.values())
		for (const n of nodes) {
			for (const d of n.dependencies) {
				if (!this.nodes.has(d.key)) throw D.unknownDependency(d.description, n.token.description)
			}
		}
		const layers: Token<unknown>[][] = []
		const removed = new Set<symbol>()
		let progressed = true
		while (removed.size < this.nodes.size && progressed) {
			progressed = false
			const frontier: NodeEntry[] = []
			for (const n of nodes) {
				if (removed.has(n.token.key)) continue
				const hasUnresolvedDeps = n.dependencies.some(d => !removed.has(d.key))
				if (!hasUnresolvedDeps) frontier.push(n)
			}
			if (frontier.length > 0) {
				layers.push(frontier.map(n => n.token))
				for (const n of frontier) removed.add(n.token.key)
				progressed = true
			}
		}
		if (removed.size !== this.nodes.size) throw D.cycleDetected()
		this.layers = layers
		return layers
	}

	private getNodeEntry(token: Token<unknown>): NodeEntry {
		const n = this.nodes.get(token.key)
		if (!n) throw D.invariantMissingNode()
		return n
	}

	private guardProvider<T>(token: Token<T>, provider: Provider<T>): Provider<T> {
		if (isValueProvider(provider)) {
			const v = provider.useValue
			if (isPromiseLike(v)) {
				throw D.asyncUseValuePromise(token.description)
			}
			return provider
		}
		if (isFactoryProvider(provider)) {
			const orig: (...args: unknown[]) => T = provider.useFactory as unknown as (...args: unknown[]) => T
			if (orig.constructor && orig.constructor.name === 'AsyncFunction') {
				throw D.asyncUseFactoryAsync(token.description)
			}
			const wrapped: (...args: unknown[]) => T = (...args: unknown[]) => {
				const res = orig(...args)
				if (isPromiseLike(res)) {
					throw D.asyncUseFactoryPromise(token.description)
				}
				return res as T
			}
			return { ...provider, useFactory: wrapped }
		}
		if (isClassProvider(provider)) {
			return provider
		}
		return provider
	}

	private async runPhase(lc: Lifecycle, phase: LifecyclePhase, timeoutMs: number | undefined): Promise<{ ok: true, durationMs: number } | { ok: false, durationMs: number, error: Error, timedOut: boolean }> {
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

	private getTimeout(token: Token<unknown>, phase: LifecyclePhase): number | undefined {
		const perNode = this.getNodeEntry(token).timeouts
		const fromNode = phase === 'start' ? perNode?.onStart : phase === 'stop' ? perNode?.onStop : perNode?.onDestroy
		const fromDefault = phase === 'start' ? this.defaultTimeouts.onStart : phase === 'stop' ? this.defaultTimeouts.onStop : this.defaultTimeouts.onDestroy
		return fromNode ?? fromDefault
	}

	private groupByLayerOrder(tokens: Token<unknown>[]): Token<unknown>[][] {
		const layerIndex = new Map<symbol, number>()
		const layers = this.topoLayers()
		layers.forEach((layer, idx) => layer.forEach(tk => layerIndex.set(tk.key, idx)))
		const groups = new Map<number, Token<unknown>[]>()
		for (const tk of tokens) {
			const idx = layerIndex.get(tk.key)
			if (idx === undefined) continue
			const arr = groups.get(idx) ?? []
			arr.push(tk)
			groups.set(idx, arr)
		}
		return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]).map(([, arr]) => arr)
	}

	async stop(): Promise<void> {
		const layers = this.topoLayers().slice().reverse()
		const errors: LifecycleErrorDetail[] = []
		for (const layer of layers) {
			const tasks: Promise<LifecycleErrorDetail | undefined>[] = []
			for (const tk of layer) {
				const inst = this.container.get(tk)
				if (inst instanceof Lifecycle && inst.state === 'started') {
					const timeoutMs = this.getTimeout(tk, 'stop')
					tasks.push(this.runPhase(inst, 'stop', timeoutMs).then((r) => {
						if (r.ok) {
							this.events?.onComponentStop?.({ token: tk, durationMs: r.durationMs })
							return undefined
						}
						const d = D.makeDetail(tk, 'stop', 'normal', r)
						this.events?.onComponentError?.(d)
						return d
					}))
				}
			}
			const settled = await Promise.all(tasks)
			for (const d of settled) if (d) errors.push(d)
		}
		if (errors.length) {
			const agg = D.stopAggregate()
			throw new AggregateLifecycleError({ code: agg.code, message: agg.message, helpUrl: agg.helpUrl }, errors)
		}
	}

	// Consolidated destroy: single pass — stop if started, then destroy; finally destroy container
	async destroy(): Promise<void> {
		const layers = this.topoLayers().slice().reverse()
		const errors: LifecycleErrorDetail[] = []
		for (const layer of layers) {
			const tasks: Promise<LifecycleErrorDetail[] | undefined>[] = []
			for (const tk of layer) {
				const inst = this.container.get(tk)
				if (!(inst instanceof Lifecycle)) continue
				if (inst.state === 'destroyed') continue
				const stopTimeout = this.getTimeout(tk, 'stop')
				const destroyTimeout = this.getTimeout(tk, 'destroy')
				tasks.push((async () => {
					const localErrors: LifecycleErrorDetail[] = []
					// Stop if needed
					if (inst.state === 'started') {
						const r = await this.runPhase(inst, 'stop', stopTimeout)
						if (r.ok) {
							this.events?.onComponentStop?.({ token: tk, durationMs: r.durationMs })
						}
						else {
							const d = D.makeDetail(tk, 'stop', 'normal', r)
							this.events?.onComponentError?.(d)
							localErrors.push(d)
						}
					}
					// Destroy if not already destroyed
					if (inst.state !== 'destroyed') {
						const r2 = await this.runPhase(inst, 'destroy', destroyTimeout)
						if (r2.ok) {
							this.events?.onComponentDestroy?.({ token: tk, durationMs: r2.durationMs })
						}
						else {
							const d2 = D.makeDetail(tk, 'destroy', 'normal', r2)
							this.events?.onComponentError?.(d2)
							localErrors.push(d2)
						}
					}
					return localErrors.length ? localErrors : undefined
				})())
			}
			const settled = await Promise.all(tasks)
			for (const arr of settled) if (arr) errors.push(...arr)
		}
		// Finally, destroy the container and collect its errors
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
	const seen = new Set<symbol>()
	const out: Token<unknown>[] = []
	for (const d of arr) {
		if (!d || seen.has(d.key)) continue
		seen.add(d.key)
		out.push(d)
	}
	return out
}

export interface RegisterOptions {
	dependencies?: Token<unknown>[] | Record<string, Token<unknown>>
	timeouts?: { onStart?: number, onStop?: number, onDestroy?: number }
}

export function register<T>(token: Token<T>, provider: Provider<T>, options: RegisterOptions = {}): OrchestratorRegistration<T> {
	const deps = normalizeDeps(options.dependencies)
	const dependencies = deps.filter(d => d.key !== token.key)
	return { token, provider, dependencies, timeouts: options.timeouts }
}

function isPromiseLike(x: unknown): x is PromiseLike<unknown> {
	return typeof x === 'object' && x !== null && 'then' in (x as { then?: unknown }) && typeof (x as { then?: unknown }).then === 'function'
}
