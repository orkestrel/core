import { Lifecycle } from './lifecycle.js'
import { Registry } from './registry.js'
import { AggregateLifecycleError, D, tokenDescription } from './diagnostics.js'

/**
 * Unique runtime identifier for a capability (port) or service.
 *
 * Tokens are plain symbols with an optional description (from Symbol(description)).
 */
export type Token<T> = symbol & { readonly __t?: T }

/**
 * Create a new unique {@link Token} with the given description.
 * @typeParam T - The value type associated with the token.
 * @param description - Human-friendly identifier used in diagnostics.
 * @returns A unique symbol token.
 */
export function createToken<_T = unknown>(description: string): Token<_T> {
	return Symbol(description) as Token<_T>
}

// ---------------------------
// Provider type definitions
// ---------------------------

/** Provider that supplies a pre-constructed value. */
export interface ValueProvider<T> { useValue: T }

/** Tuple form for inject definitions that mirrors positional parameters. */
export type InjectTuple<A extends readonly unknown[]> = { [K in keyof A]: Token<A[K]> }
/** Object form for inject definitions that mirrors a named dependency bag. */
export type InjectObject<O extends Record<string, unknown>> = { [K in keyof O]: Token<O[K]> }

// Factory providers
/** Factory with no explicit dependencies (optionally receives the Container). */
export type FactoryProviderNoDeps<T> = { useFactory: () => T } | { useFactory: (container: Container) => T }
/** Factory with positional injection. */
export type FactoryProviderWithTuple<T, A extends readonly unknown[]> = { useFactory: (...args: A) => T, inject: InjectTuple<A> }
/** Factory with named-object injection. */
export type FactoryProviderWithObject<T, O extends Record<string, unknown>> = { useFactory: (deps: O) => T, inject: InjectObject<O> }
/** All factory provider shapes (synchronous only). */
export type FactoryProvider<T> = FactoryProviderNoDeps<T> | FactoryProviderWithTuple<T, readonly unknown[]> | FactoryProviderWithObject<T, Record<string, unknown>>

// Class providers
/** Constructor with no explicit dependencies. */
export type CtorNoDeps<T> = new () => T
/** Constructor that receives the Container as the single parameter. */
export type CtorWithContainer<T> = new (container: Container) => T
/** Class provider without tuple injection. */
export type ClassProviderNoDeps<T> = { useClass: CtorNoDeps<T> | CtorWithContainer<T> }
/** Class provider with positional injection. */
export type ClassProviderWithTuple<T, A extends readonly unknown[]> = { useClass: new (...args: A) => T, inject: InjectTuple<A> }
/** All class provider shapes (synchronous only). */
export type ClassProvider<T> = ClassProviderNoDeps<T> | ClassProviderWithTuple<T, readonly unknown[]>

/** Union of all supported provider forms, including raw values. */
export type Provider<T> = T | ValueProvider<T> | FactoryProvider<T> | ClassProvider<T>

// Safe hasOwn helper for type guards
function hasOwn<O extends object, K extends PropertyKey>(obj: O, key: K): obj is O & Record<K, unknown> {
	return Object.prototype.hasOwnProperty.call(obj, key)
}

export function isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> {
	return typeof p === 'object' && p !== null && hasOwn(p, 'useValue')
}

export function isFactoryProvider<T>(p: Provider<T>): p is FactoryProvider<T> {
	return typeof p === 'object' && p !== null && hasOwn(p, 'useFactory')
}

export function isClassProvider<T>(p: Provider<T>): p is ClassProvider<T> {
	return typeof p === 'object' && p !== null && hasOwn(p, 'useClass')
}

// ---------------------------
// Typing helpers for token maps
// ---------------------------

/** Internal helper record shape for token maps. */
type TokenRecord = Record<string, Token<unknown>>
/** Converts a token map into its resolved value map type. */
export type TokensOf<T extends Record<string, unknown>> = { [K in keyof T & string]: Token<T[K]> }

type ResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }

type OptionalResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }

/**
 * Create a namespaced set of {@link Token}s based on a given shape.
 * @param namespace - Namespace prefix used in token descriptions.
 * @param shape - Object whose keys become token names and values define types.
 */
export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): TokensOf<T> {
	const out: Partial<Record<keyof T & string, Token<unknown>>> = {}
	for (const key of Object.keys(shape) as (keyof T & string)[]) out[key] = createToken(`${namespace}:${key}`)
	return out as TokensOf<T>
}

// ---------------------------
// Container implementation
// ---------------------------

/** Options for {@link Container} construction. */
export interface ContainerOptions { parent?: Container }

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
		if (typeof tokenOrMap === 'symbol') {
			// strict single-token retrieval
			const reg = this.lookup(tokenOrMap)
			if (!reg) throw D.containerNoProvider(tokenDescription(tokenOrMap))
			return this.materialize(reg).value
		}
		// map retrieval (strict)
		return this.retrievalMap(tokenOrMap, true)
	}

	get<T>(token: Token<T>): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap): OptionalResolvedMap<TMap>
	/** Optionally resolve a single token or a map of tokens (missing entries return undefined). */
	get(tokenOrMap: Token<unknown> | TokenRecord): unknown {
		if (typeof tokenOrMap === 'symbol') {
			// loose single-token retrieval
			const reg = this.lookup(tokenOrMap)
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
	 * @param arg1 - Either the work function, or the apply function when two args are used.
	 * @param arg2 - The work function when also providing an apply function.
	 */
	async using<T>(arg1: ((scope: Container) => void) | ((scope: Container) => Promise<T> | T), arg2?: (scope: Container) => Promise<T> | T): Promise<T> {
		const scope = this.createChild()
		try {
			if (arg2) {
				const apply = arg1 as (scope: Container) => void
				apply(scope)
				return await arg2(scope)
			}
			const fn = arg1 as (scope: Container) => Promise<T> | T
			return await fn(scope)
		}
		finally {
			await scope.destroy()
		}
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
			if (hasOwn(provider, 'inject')) {
				const inj = provider.inject
				if (Array.isArray(inj)) {
					const args = this.resolveTuple(inj as InjectTuple<readonly unknown[]>)
					return this.wrapLifecycle((provider as FactoryProviderWithTuple<T, readonly unknown[]>).useFactory(...args), true)
				}
				const deps = this.resolveObject((inj as InjectObject<Record<string, unknown>>))
				return this.wrapLifecycle((provider as FactoryProviderWithObject<T, Record<string, unknown>>).useFactory(deps), true)
			}
			const fn = provider.useFactory as ((container?: Container) => T)
			return this.wrapLifecycle(fn(this), true)
		}

		if (isClassProvider(provider)) {
			if (hasOwn(provider, 'inject')) {
				const inj = provider.inject
				if (Array.isArray(inj)) {
					const args = this.resolveTuple(inj as InjectTuple<readonly unknown[]>)
					return this.wrapLifecycle(new (provider as ClassProviderWithTuple<T, readonly unknown[]>).useClass(...args), true)
				}
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

// Registration internals
interface ResolvedProvider<T> { value: T, lifecycle?: Lifecycle, disposable: boolean }
interface Registration<T> { token: Token<T>, provider: Provider<T>, resolved?: ResolvedProvider<T> }

// ---------------------------
// Global container registry helper
// ---------------------------

/** Callable getter and manager for global Container instances. */
export type ContainerGetter = {
	(name?: string | symbol): Container
	/** Register a named container; pass lock=true to prevent replacement. */
	set(name: string | symbol, c: Container, lock?: boolean): void
	/** Clear a named container; returns false when locked or missing; default is protected. */
	clear(name?: string | symbol, force?: boolean): boolean
	/** List registered container keys (includes the default symbol). */
	list(): (string | symbol)[]

	/** Resolve via the default or named container (strict). */
	resolve<T>(token: Token<T>, name?: string | symbol): T
	resolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): ResolvedMap<TMap>

	/** Get via the default or named container (optional). */
	get<T>(token: Token<T>, name?: string | symbol): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): OptionalResolvedMap<TMap>

	/** Run work in a child scope of the default or named container. */
	using<T>(fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T>
}

const containerRegistry = new Registry<Container>('container', new Container())

function containerResolve<T>(token: Token<T>, name?: string | symbol): T
function containerResolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): ResolvedMap<TMap>
function containerResolve(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (typeof tokenOrMap === 'symbol') {
		return c.resolve(tokenOrMap)
	}
	return c.resolve(tokenOrMap)
}

function containerGet<T>(token: Token<T>, name?: string | symbol): T | undefined
function containerGet<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): OptionalResolvedMap<TMap>
function containerGet(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (typeof tokenOrMap === 'symbol') {
		return c.get(tokenOrMap)
	}
	return c.get(tokenOrMap)
}

function containerUsing<T>(fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T> {
	const c = containerRegistry.resolve(name)
	return c.using(fn)
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
