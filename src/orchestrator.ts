import type { Provider, Token } from './container.js'
import { Container, isClassProvider, isFactoryProvider, isValueProvider, container } from './container.js'
import { Lifecycle } from './lifecycle.js'
import { AggregateLifecycleError, type LifecycleContext, type LifecycleErrorDetail, type LifecyclePhase, TimeoutError } from './errors.js'
import { Registry } from './registry.js'

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
		if (this.nodes.has(token.key)) throw new Error(`Duplicate registration for ${token.description}`)
		this.nodes.set(token.key, { token: token as Token<unknown>, dependencies, timeouts })
		const guarded = this.guardProvider(token, provider)
		this.container.register(token, guarded)
		this.layers = null
	}

	async start(regs: OrchestratorRegistration<unknown>[]): Promise<void> {
		for (const e of regs) {
			const deps = e.dependencies ?? []
			if (this.nodes.has(e.token.key)) throw new Error(`Duplicate registration for ${e.token.description}`)
			this.nodes.set(e.token.key, { token: e.token as Token<unknown>, dependencies: deps, timeouts: e.timeouts })
			const guarded = this.guardProvider(e.token, e.provider)
			this.container.register(e.token, guarded)
		}
		this.layers = null
		await this.startAll()
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
				if (!this.nodes.has(d.key)) throw new Error(`Unknown dependency ${d.description} required by ${n.token.description}`)
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
		if (removed.size !== this.nodes.size) throw new Error('Cycle detected in dependencies')
		this.layers = layers
		return layers
	}

	private getNodeEntry(token: Token<unknown>): NodeEntry {
		const n = this.nodes.get(token.key)
		if (!n) throw new Error('Invariant: missing node entry')
		return n
	}

	private guardProvider<T>(token: Token<T>, provider: Provider<T>): Provider<T> {
		if (isValueProvider(provider)) {
			const v = provider.useValue
			if (isPromiseLike(v)) {
				throw new Error(`Async providers are not supported: token '${token.description}' was registered with useValue that is a Promise. Move async work into Lifecycle.onStart or pre-resolve the value before registration.`)
			}
			return provider
		}
		if (isFactoryProvider(provider)) {
			const orig: (c: Container) => T = provider.useFactory
			if (orig.constructor && orig.constructor.name === 'AsyncFunction') {
				throw new Error(`Async providers are not supported: useFactory for token '${token.description}' is an async function. Factories must be synchronous. Move async work into Lifecycle.onStart or pre-resolve the value.`)
			}
			const wrapped: (c: Container) => T = (c: Container) => {
				const res = orig(c)
				if (isPromiseLike(res)) {
					throw new Error(`Async providers are not supported: useFactory for token '${token.description}' returned a Promise. Factories must be synchronous. Move async work into Lifecycle.onStart or pre-resolve the value.`)
				}
				return res as T
			}
			return { useFactory: wrapped }
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

	private makeDetail(token: Token<unknown>, phase: LifecyclePhase, context: LifecycleContext, res: { durationMs: number, error: Error, timedOut?: boolean }): LifecycleErrorDetail {
		return {
			tokenDescription: token.description,
			tokenKey: token.key,
			phase,
			context,
			timedOut: res.timedOut ?? false,
			durationMs: res.durationMs,
			error: res.error,
		}
	}

	private getTimeout(token: Token<unknown>, phase: LifecyclePhase): number | undefined {
		const perNode = this.getNodeEntry(token).timeouts
		const fromNode = phase === 'start' ? perNode?.onStart : phase === 'stop' ? perNode?.onStop : perNode?.onDestroy
		const fromDefault = phase === 'start' ? this.defaultTimeouts.onStart : phase === 'stop' ? this.defaultTimeouts.onStop : this.defaultTimeouts.onDestroy
		return fromNode ?? fromDefault
	}

	async startAll(): Promise<void> {
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
					const detail = this.makeDetail(t.token, 'start', 'normal', r)
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
									const d = this.makeDetail(tk, 'stop', 'rollback', r)
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
				throw new AggregateLifecycleError('Errors during startAll', [...failures, ...rollbackErrors])
			}
			for (const s of successes) startedOrder.push({ token: s.token, lc: s.lc })
		}
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

	async stopAll(): Promise<void> {
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
						const d = this.makeDetail(tk, 'stop', 'normal', r)
						this.events?.onComponentError?.(d)
						return d
					}))
				}
			}
			const settled = await Promise.all(tasks)
			for (const d of settled) if (d) errors.push(d)
		}
		if (errors.length) throw new AggregateLifecycleError('Errors during stopAll', errors)
	}

	async destroyAll(): Promise<void> {
		const layers = this.topoLayers().slice().reverse()
		const errors: LifecycleErrorDetail[] = []
		for (const layer of layers) {
			const tasks: Promise<LifecycleErrorDetail | undefined>[] = []
			for (const tk of layer) {
				const inst = this.container.get(tk)
				if (inst instanceof Lifecycle && inst.state !== 'destroyed') {
					const timeoutMs = this.getTimeout(tk, 'destroy')
					tasks.push(this.runPhase(inst, 'destroy', timeoutMs).then((r) => {
						if (r.ok) {
							this.events?.onComponentDestroy?.({ token: tk, durationMs: r.durationMs })
							return undefined
						}
						const d = this.makeDetail(tk, 'destroy', 'normal', r)
						this.events?.onComponentError?.(d)
						return d
					}))
				}
			}
			const settled = await Promise.all(tasks)
			for (const d of settled) if (d) errors.push(d)
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
		if (errors.length) throw new AggregateLifecycleError('Errors during destroyAll', errors)
	}
}

export type OrchestratorGetter = {
	(name?: string | symbol): Orchestrator
	set(o: Orchestrator, name?: string | symbol): void
	clear(name?: string | symbol): boolean
	list(): (string | symbol)[]
}

const DEFAULT_ORCHESTRATOR_KEY = Symbol('orchestrator.default')
const orchestratorRegistry = new Registry<Orchestrator>('orchestrator', DEFAULT_ORCHESTRATOR_KEY)

if (!orchestratorRegistry.get()) {
	orchestratorRegistry.setDefault(new Orchestrator(container()))
}

export const orchestrator: OrchestratorGetter = Object.assign(
	(name?: string | symbol): Orchestrator => orchestratorRegistry.resolve(name),
	{
		set(o: Orchestrator, name?: string | symbol) {
			if (name === undefined) orchestratorRegistry.setDefault(o)
			else orchestratorRegistry.set(name, o)
		},
		clear(name?: string | symbol) { return orchestratorRegistry.clear(name) },
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
