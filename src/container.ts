import { Lifecycle } from './lifecycle.js'
import { Registry } from './registry.js'
import { AggregateLifecycleError, D, tokenDescription } from './diagnostics.js'
import type {
	Token,
	ValueProvider,
	FactoryProviderNoDeps,
	FactoryProviderWithTuple,
	FactoryProviderWithObject,
	ClassProviderNoDeps,
	ClassProviderWithTuple,
	Provider,
	InjectTuple,
	InjectObject,
	CtorNoDeps,
	CtorWithContainer,
	TokenRecord,
	ResolvedMap,
	OptionalResolvedMap,
	ContainerOptions,
	ResolvedProvider,
	Registration,
	ContainerGetter,
} from './types.js'
import {
	isValueProvider,
	isFactoryProvider,
	isClassProvider,
	isClassProviderWithTuple,
	isFactoryProviderWithTuple,
	isFactoryProviderWithObject,
	isFactoryProviderNoDeps,
	isZeroArg,
} from './types.js'

/**
 * Minimal, strongly-typed DI container.
 *
 * - Registers providers (value, factory, class) under Tokens.
 * - Resolves single tokens or token maps, strictly (`resolve`) or optionally (`get`).
 * - Supports child scopes and scoped work via `using`.
 * - Destroys owned lifecycles on `destroy()`.
 */
export class Container {
	private readonly registry = new Registry<Registration<unknown>>('provider')
	private readonly parent?: Container
	private destroyed = false

	constructor(opts: ContainerOptions = {}) { this.parent = opts.parent }

	// Concise overload set for strong contextual typing
	register<T, A extends readonly unknown[]>(token: Token<T>, provider: FactoryProviderWithTuple<T, A> | ClassProviderWithTuple<T, A>, lock?: boolean): this
	register<T, O extends Record<string, unknown>>(token: Token<T>, provider: FactoryProviderWithObject<T, O>, lock?: boolean): this
	register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, lock?: boolean): this
	/**
	 * Register a provider under a token.
	 * @param token - The unique token.
	 * @param provider - The provider (value/factory/class) or raw value.
	 * @param lock - When true, prevents re-registration for the same token.
	 */
	register<T>(token: Token<T>, provider: Provider<T>, lock?: boolean): this {
		this.assertNotDestroyed()
		this.registry.set(token, { token, provider } as Registration<T>, lock)
		return this
	}

	/** Shorthand for registering a value provider. */
	set<T>(token: Token<T>, value: T, lock?: boolean): void { this.register(token, { useValue: value }, lock) }

	/** Returns true when a provider is available for the token (searches parents). */
	has<T>(token: Token<T>): boolean {
		return !!this.registry.get(token) || (this.parent?.has(token) ?? false)
	}

	resolve<T>(token: Token<T>): T
	resolve<TMap extends TokenRecord>(tokens: TMap): ResolvedMap<TMap>
	/** Strictly resolve a single token or a map of tokens, throwing if any are missing. */
	resolve(tokenOrMap: Token<unknown> | TokenRecord): unknown {
		if (typeof tokenOrMap !== 'object') {
			// strict single-token retrieval
			const reg = this.lookup(tokenOrMap as Token<unknown>)
			if (!reg) throw D.containerNoProvider(tokenDescription(tokenOrMap as symbol))
			return this.materialize(reg).value
		}
		// map retrieval (strict)
		return this.retrievalMap(tokenOrMap, true)
	}

	get<T>(token: Token<T>): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap): OptionalResolvedMap<TMap>
	/** Optionally resolve a single token or a map of tokens (missing entries return undefined). */
	get(tokenOrMap: Token<unknown> | TokenRecord): unknown {
		if (typeof tokenOrMap !== 'object') {
			// loose single-token retrieval
			const reg = this.lookup(tokenOrMap as Token<unknown>)
			return reg ? this.materialize(reg).value : undefined
		}
		// map retrieval (loose)
		return this.retrievalMap(tokenOrMap, false)
	}

	/** Create a child container that inherits providers from this container. */
	createChild(): Container { return new Container({ parent: this }) }

	// Overloads: using(fn) and using(apply, fn)
	async using<T>(fn: (scope: Container) => Promise<T> | T): Promise<T>
	async using<T>(apply: (scope: Container) => void, fn: (scope: Container) => Promise<T> | T): Promise<T>
	/**
	 * Run work inside an automatically destroyed child scope.
	 * - using(fn): create child, run fn(child), destroy child.
	 * - using(apply, fn): create child, run apply(child) to register overrides, then fn(child), destroy child.
	 */
	async using<T>(arg1: ((scope: Container) => void) | ((scope: Container) => Promise<T> | T), arg2?: (scope: Container) => Promise<T> | T): Promise<T> {
		const scope = this.createChild()
		try {
			if (arg2) {
				const apply = arg1 as (scope: Container) => void
				apply(scope)
				return await (arg2 as (scope: Container) => Promise<T> | T)(scope)
			}
			const fn = arg1 as (scope: Container) => Promise<T> | T
			return await fn(scope)
		}
		finally { await scope.destroy() }
	}

	/** Destroy owned lifecycles (stop if needed, then destroy). Idempotent. */
	async destroy(): Promise<void> {
		if (this.destroyed) return
		this.destroyed = true
		const errors: Error[] = []
		for (const key of this.registry.list()) {
			const reg = this.registry.get(key as symbol) as Registration<unknown> | undefined
			if (!reg) continue
			const resolved = reg.resolved
			if (resolved?.lifecycle && resolved.disposable) {
				const lc = resolved.lifecycle
				try {
					if (lc.state === 'started') await lc.stop()
					if (lc.state !== 'destroyed') await lc.destroy()
				}
				catch (e) { errors.push(e instanceof Error ? e : new Error(String(e))) }
			}
		}
		if (errors.length) {
			const info = D.containerDestroyAggregate()
			throw new AggregateLifecycleError({ code: info.code, message: info.message, helpUrl: info.helpUrl }, errors)
		}
	}

	// ---------------------------
	// Internals
	// ---------------------------

	private lookup<T>(token: Token<T>): Registration<T> | undefined {
		return (this.registry.get(token) as Registration<T> | undefined) ?? this.parent?.lookup(token)
	}

	private materialize<T>(reg: Registration<T>): ResolvedProvider<T> {
		if (reg.resolved) return reg.resolved
		const resolved = this.instantiate(reg.provider)
		reg.resolved = resolved
		return resolved
	}

	private instantiate<T>(provider: Provider<T>): ResolvedProvider<T> {
		if (isValueProvider(provider)) return this.wrapLifecycle(provider.useValue, false)

		if (isFactoryProvider(provider)) {
			if (isFactoryProviderWithTuple<T, readonly unknown[]>(provider)) {
				const args = this.resolveTuple(provider.inject)
				return this.wrapLifecycle(provider.useFactory(...args), true)
			}
			if (isFactoryProviderWithObject(provider)) {
				const deps = this.resolveObject(provider.inject)
				return this.wrapLifecycle(provider.useFactory(deps), true)
			}
			if (isFactoryProviderNoDeps<T>(provider)) {
				const uf = provider.useFactory
				return this.wrapLifecycle(isZeroArg(uf) ? uf() : uf(this), true)
			}
		}

		if (isClassProvider(provider)) {
			if (isClassProviderWithTuple<T, readonly unknown[]>(provider)) {
				const args = this.resolveTuple(provider.inject)
				return this.wrapLifecycle(new provider.useClass(...args), true)
			}
			const Ctor = (provider as ClassProviderNoDeps<T>).useClass
			const arity = (Ctor as unknown as { length: number }).length
			if (arity >= 1) {
				return this.wrapLifecycle(new (Ctor as CtorWithContainer<T>)(this), true)
			}
			return this.wrapLifecycle(new (Ctor as CtorNoDeps<T>)(), true)
		}

		// Raw value
		return this.wrapLifecycle(provider as T, false)
	}

	private wrapLifecycle<T>(value: T, disposable: boolean): ResolvedProvider<T> {
		return value instanceof Lifecycle ? { value, lifecycle: value, disposable } : { value, disposable }
	}

	private assertNotDestroyed(): void { if (this.destroyed) throw D.containerDestroyed() }

	// Consolidated map retrieval for resolve()/get()
	private retrievalMap(tokens: TokenRecord, strict: boolean): Record<string, unknown> {
		const out: Record<string, unknown> = {}
		for (const key of Object.keys(tokens)) {
			const tk = tokens[key]
			const reg = this.lookup(tk)
			if (!reg) {
				if (strict) throw D.containerNoProvider(tokenDescription(tk))
				out[key] = undefined
				continue
			}
			out[key] = this.materialize(reg).value
		}
		return out
	}

	// Helpers to resolve inject shapes with strong typing
	private resolveTuple<A extends readonly unknown[]>(inj: InjectTuple<A>): A {
		return inj.map(t => this.resolve(t)) as unknown as A
	}

	private resolveObject<O extends Record<string, unknown>>(inj: InjectObject<O>): O {
		const out: { [K in keyof O]?: O[K] } = {}
		const keys = Object.keys(inj) as Array<keyof O>
		for (const key of keys) {
			const tk = inj[key] as Token<O[typeof key]>
			out[key] = this.resolve(tk)
		}
		return out as O
	}
}

// ---------------------------
// Global container registry helper
// ---------------------------

const containerRegistry = new Registry<Container>('container', new Container())

function containerResolve<T>(token: Token<T>, name?: string | symbol): T
function containerResolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): ResolvedMap<TMap>
function containerResolve(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (typeof tokenOrMap !== 'object') {
		return c.resolve(tokenOrMap as Token<unknown>)
	}
	return c.resolve(tokenOrMap)
}

function containerGet<T>(token: Token<T>, name?: string | symbol): T | undefined
function containerGet<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): OptionalResolvedMap<TMap>
function containerGet(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (typeof tokenOrMap !== 'object') {
		return c.get(tokenOrMap as Token<unknown>)
	}
	return c.get(tokenOrMap)
}

function containerUsing<T>(fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T>
function containerUsing<T>(apply: (scope: Container) => void, fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T>
function containerUsing<T>(
	arg1: ((scope: Container) => void) | ((scope: Container) => Promise<T> | T),
	arg2?: ((scope: Container) => Promise<T> | T) | (string | symbol),
	arg3?: string | symbol,
): Promise<T> {
	let apply: ((scope: Container) => void) | undefined
	let fn: (scope: Container) => Promise<T> | T
	let name: string | symbol | undefined

	if (typeof arg2 === 'function') {
		apply = arg1 as (scope: Container) => void
		fn = arg2 as (scope: Container) => Promise<T> | T
		name = arg3
	}
	else {
		fn = arg1 as (scope: Container) => Promise<T> | T
		name = arg2 as (string | symbol | undefined)
	}
	const c = containerRegistry.resolve(name)
	return apply ? c.using(apply, fn) : c.using(fn)
}

/**
 * Global container getter.
 *
 * The default container is created at module load and registered under a symbol key.
 * You can register additional named containers via `container.set(name, instance, lock?)`.
 */
export const container = Object.assign(
	(name?: string | symbol): Container => containerRegistry.resolve(name),
	{
		set(name: string | symbol, c: Container, lock?: boolean) {
			containerRegistry.set(name, c, lock)
		},
		clear(name?: string | symbol, force?: boolean) { return containerRegistry.clear(name, force) },
		list() { return containerRegistry.list() },

		resolve: containerResolve,
		get: containerGet,
		using: containerUsing,
	},
) satisfies ContainerGetter
