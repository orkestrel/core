import type { Provider, Token } from './container.js'
import { Container } from './container.js'
import { Lifecycle } from './lifecycle.js'
import { AggregateLifecycleError } from './errors.js'
import { Registry } from './registry.js'

export interface OrchestratorRegistration<T> { token: Token<T>, provider: Provider<T>, deps?: Token<unknown>[] }

interface NodeEntry { token: Token<unknown>, deps: Token<unknown>[] }

export class Orchestrator {
	private readonly container: Container
	private readonly nodes = new Map<symbol, NodeEntry>()
	private ordered: Token<unknown>[] | null = null

	constructor(container?: Container) {
		this.container = container ?? new Container()
	}

	getContainer(): Container { return this.container }

	register<T>(token: Token<T>, provider: Provider<T>, deps: Token<unknown>[] = []): void {
		if (this.nodes.has(token.key)) throw new Error(`Duplicate registration for ${token.description}`)
		this.nodes.set(token.key, { token: token as Token<unknown>, deps })
		this.container.register(token, provider)
		this.ordered = null
	}

	async start(regs: OrchestratorRegistration<unknown>[]): Promise<void> {
		for (const e of regs) {
			this.register(e.token as Token<unknown>, e.provider as Provider<unknown>, e.deps ?? [])
		}
		await this.startAll()
	}

	private topo(): Token<unknown>[] {
		if (this.ordered) return this.ordered
		const inDegree = new Map<symbol, number>()
		for (const n of this.nodes.values()) {
			inDegree.set(n.token.key, 0)
		}
		for (const n of this.nodes.values()) {
			for (const d of n.deps) {
				if (!this.nodes.has(d.key)) throw new Error(`Unknown dependency ${d.description} required by ${n.token.description}`)
				inDegree.set(n.token.key, (inDegree.get(n.token.key) ?? 0) + 1)
			}
		}
		const queue: NodeEntry[] = []
		for (const n of this.nodes.values()) {
			if ((inDegree.get(n.token.key) ?? 0) === 0) {
				queue.push(n)
			}
		}
		const order: Token<unknown>[] = []
		while (queue.length) {
			const n = queue.shift()!
			order.push(n.token)
			for (const m of this.nodes.values()) {
				if (m.deps.some(d => d.key === n.token.key)) {
					inDegree.set(m.token.key, (inDegree.get(m.token.key) ?? 0) - 1)
					if ((inDegree.get(m.token.key) ?? 0) === 0) {
						queue.push(m)
					}
				}
			}
		}
		if (order.length !== this.nodes.size) throw new Error('Cycle detected in dependencies')
		this.ordered = order
		return order
	}

	private lifecyclesInOrder(): Lifecycle[] {
		const list: Lifecycle[] = []
		for (const tk of this.topo()) {
			const inst = this.container.get(tk as Token<unknown>)
			if (inst instanceof Lifecycle) list.push(inst)
		}
		return list
	}

	async startAll(): Promise<void> {
		const lcs = this.lifecyclesInOrder()
		const errors: Error[] = []
		for (const lc of lcs) {
			if (lc.state === 'created') {
				try {
					await lc.start()
				}
				catch (e) {
					errors.push(e instanceof Error ? e : new Error(String(e)))
					break
				}
			}
		}
		if (errors.length) throw new AggregateLifecycleError('Errors during startAll', errors)
	}

	async stopAll(): Promise<void> {
		const lcs = this.lifecyclesInOrder().reverse()
		const errors: Error[] = []
		for (const lc of lcs) {
			if (lc.state === 'started') {
				try {
					await lc.stop()
				}
				catch (e) {
					errors.push(e instanceof Error ? e : new Error(String(e)))
				}
			}
		}
		if (errors.length) throw new AggregateLifecycleError('Errors during stopAll', errors)
	}

	async destroyAll(): Promise<void> {
		const lcs = this.lifecyclesInOrder().reverse()
		const errors: Error[] = []
		for (const lc of lcs) {
			if (lc.state !== 'destroyed') {
				try {
					await lc.destroy()
				}
				catch (e) {
					errors.push(e instanceof Error ? e : new Error(String(e)))
				}
			}
		}
		try {
			await this.container.destroy()
		}
		catch (e) {
			errors.push(e instanceof Error ? e : new Error(String(e)))
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

export const orchestrator: OrchestratorGetter = Object.assign(
	(name?: string | symbol): Orchestrator => orchestratorRegistry.get(name),
	{
		set(o: Orchestrator, name?: string | symbol) {
			if (name === undefined) orchestratorRegistry.setDefault(o)
			else orchestratorRegistry.set(name, o)
		},
		clear(name?: string | symbol) { return orchestratorRegistry.clear(name) },
		list() { return orchestratorRegistry.list() },
	},
)
