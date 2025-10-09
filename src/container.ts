import { Lifecycle } from './lifecycle.js'
import { RegistryAdapter } from './adapters/registry.js'
import { CONTAINER_MESSAGES, HELP } from './constants.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import type {
	ClassProviderNoDeps,
	ClassProviderWithObject,
	ClassProviderWithTuple,
	ContainerOptions,
	DiagnosticPort,
	FactoryProviderNoDeps,
	FactoryProviderWithObject,
	FactoryProviderWithTuple,
	InjectObject,
	LoggerPort,
	OptionalResolvedMap,
	Provider,
	Registration,
	ResolvedMap,
	ResolvedProvider,
	Token,
	TokenRecord,
	ValueProvider,
	ContainerGetter,
} from './types.js'
import {
	isClassProvider,
	isClassProviderNoDeps,
	isClassProviderWithContainer,
	isClassProviderWithObject,
	isClassProviderWithTuple,
	isFactoryProvider,
	isFactoryProviderNoDeps,
	isFactoryProviderWithContainer,
	isFactoryProviderWithObject,
	isFactoryProviderWithTuple,
	isRawProviderValue,
	isToken,
	isTokenRecord,
	isValueProvider,
	tokenDescription,
} from './helpers.js'
import { LoggerAdapter } from './adapters/logger'

/**
 * Minimal, strongly-typed DI container for tokens and providers.
 *
 * Features
 * - Register value, factory, or class providers under token keys.
 * - Resolve single tokens or maps strictly (throws on missing) or optionally (returns undefined).
 * - Create child scopes that inherit providers; use using() to run scoped work with auto cleanup.
 * - Destroy lifecycle-owning instances deterministically.
 *
 * Example
 * -------
 * ```ts
 * import { Container, createToken } from '@orkestrel/core'
 *
 * const A = createToken<number>('A')
 * const B = createToken<string>('B')
 * const C = createToken<{ a: number, b: string }>('C')
 *
 * const c = new Container()
 * c.set(A, 1)
 * c.set(B, 'two')
 * c.register(C, { useFactory: (a, b) => ({ a, b }), inject: [A, B] })
 *
 * const merged = c.resolve(C) // { a: 1, b: 'two' }
 * const { a, b } = c.resolve({ a: A, b: B })
 *
 * await c.using(async (scope) => {
 *   // scoped overrides
 *   scope.set(A, 99)
 *   const { a: scopedA } = scope.resolve({ a: A }) // 99
 *   // scope destroyed automatically afterwards
 * })
 *
 * await c.destroy() // stops and destroys owned Lifecycle instances
 * ```
 */
export class Container {
	readonly #registry: RegistryAdapter<Registration<unknown>>
	private readonly parent?: Container
	private destroyed = false
	readonly #diagnostic: DiagnosticPort
	readonly #logger: LoggerPort

	/**
	 * Construct a container with optional parent, logger, and diagnostic adapters.
	 * @param opts
	 */
	constructor(opts: ContainerOptions = {}) {
		this.parent = opts.parent
		this.#logger = opts.logger ?? new LoggerAdapter()
		this.#diagnostic = opts.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: CONTAINER_MESSAGES })
		this.#registry = new RegistryAdapter<Registration<unknown>>({ label: 'provider', logger: this.#logger, diagnostic: this.#diagnostic })
	}

	/** Access the diagnostic port used by this container. */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/** Access the logger port used by this container. */
	get logger(): LoggerPort { return this.#logger }

	// Overload: tuple-injected factory/class providers
	/**
	 *
	 * @param token
	 * @param provider
	 * @param lock
	 */
	register<T, A extends readonly unknown[]>(token: Token<T>, provider: FactoryProviderWithTuple<T, A> | ClassProviderWithTuple<T, A>, lock?: boolean): this
	// Overload: object-injected factory/class providers
	/**
	 *
	 * @param token
	 * @param provider
	 * @param lock
	 */
	register<T, O extends Record<string, unknown>>(token: Token<T>, provider: FactoryProviderWithObject<T, O> | ClassProviderWithObject<T, O>, lock?: boolean): this
	// Overload: no-deps/class-or-factory-or-value providers
	/**
	 *
	 * @param token
	 * @param provider
	 * @param lock
	 */
	register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, lock?: boolean): this
	/**
	 * Register a provider under a token.
	 *
	 * Supported shapes
	 * - Value: { useValue }
	 * - Factory: { useFactory } with optional inject tuple/object or container arg
	 * - Class: { useClass } with optional inject tuple/object or container arg
	 *
	 * @typeParam T - Token value type.
	 * @param token - The unique token to associate with the provider.
	 * @param provider - The provider object or raw value.
	 * @param lock - When true, prevents re-registration for the same token.
	 * @returns this for chaining.
	 * @example
	 */
	register<T>(token: Token<T>, provider: Provider<T>, lock?: boolean): this {
		this.assertNotDestroyed()
		this.#registry.set(token, { token, provider }, lock)
		return this
	}

	/**
	 * Shorthand for registering a value provider.
	 * @param token
	 * @param value
	 * @param lock
	 * @returns -
	 * @example
	 */
	set<T>(token: Token<T>, value: T, lock?: boolean): void { this.register(token, { useValue: value }, lock) }

	/**
	 * Returns true when a provider is available for the token (searches parent containers as well).
	 * @param token
	 * @returns -
	 * @example
	 */
	has<T>(token: Token<T>): boolean {
		return !!this.#registry.get(token) || (this.parent?.has(token) ?? false)
	}

	// Overload: resolve a single token
	/**
	 *
	 * @param token
	 */
	resolve<T>(token: Token<T>): T
	// Overload: resolve a token map to a map of values
	/**
	 *
	 * @param tokens
	 */
	resolve<TMap extends TokenRecord>(tokens: TMap): ResolvedMap<TMap>
	// Overload: resolve an inject object to a plain object
	/**
	 *
	 * @param tokens
	 */
	resolve<O extends Record<string, unknown>>(tokens: InjectObject<O>): O
	/**
	 * Strictly resolve a single token or a token map. Missing tokens cause ORK1006 failures.
	 *
	 * @param tokenOrMap - Token to resolve, or a record of tokens to resolve into a map.
	 * @returns The resolved value for a token, or a map of resolved values when given a record.
	 *
	 * @example
	 * const { a, b } = container.resolve({ a: A, b: B })
	 */
	resolve(tokenOrMap: Token<unknown> | TokenRecord): unknown {
		if (isToken(tokenOrMap)) {
			const reg = this.lookup(tokenOrMap)
			if (!reg) {
				this.#diagnostic.fail('ORK1006', { scope: 'container', message: `No provider for ${tokenDescription(tokenOrMap)}`, helpUrl: HELP.providers })
			}
			return this.materialize(reg).value
		}
		if (isTokenRecord(tokenOrMap)) {
			return this.retrievalMap(tokenOrMap, true)
		}
		this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: resolve() called with invalid argument' })
	}

	// Overload: optionally get a single token
	/**
	 *
	 * @param token
	 */
	get<T>(token: Token<T>): T | undefined
	// Overload: optionally get a map of tokens
	/**
	 *
	 * @param tokens
	 */
	get<TMap extends TokenRecord>(tokens: TMap): OptionalResolvedMap<TMap>
	/**
	 * Optionally resolve a single token or a map of tokens; missing entries return undefined.
	 * @param tokenOrMap
	 * @returns -
	 * @example
	 */
	get(tokenOrMap: Token<unknown> | TokenRecord): unknown {
		if (isToken(tokenOrMap)) {
			const reg = this.lookup(tokenOrMap)
			return reg ? this.materialize(reg).value : undefined
		}
		if (isTokenRecord(tokenOrMap)) {
			return this.retrievalMap(tokenOrMap, false)
		}
		this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: get() called with invalid argument' })
	}

	/** Create a child container that inherits providers from this container. */
	createChild(): Container { return new Container({ parent: this, diagnostic: this.diagnostic, logger: this.logger }) }

	// Overload: using(fn)
	/**
	 *
	 * @param fn
	 */
	async using(fn: (scope: Container) => void | Promise<void>): Promise<void>
	// Overload: using(fn) returning a value
	/**
	 *
	 * @param fn
	 */
	async using<T>(fn: (scope: Container) => T | Promise<T>): Promise<T>
	// Overload: using(apply, fn)
	/**
	 *
	 * @param apply
	 * @param fn
	 */
	async using<T>(apply: (scope: Container) => void | Promise<void>, fn: (scope: Container) => T | Promise<T>): Promise<T>
	/**
	 * Run work inside an automatically destroyed child scope.
	 *
	 * - using(fn): create child, run fn(child), always destroy child afterwards.
	 * - using(apply, fn): create child, run apply(child) to register overrides, then fn(child).
	 *
	 * @typeParam T - Return type of the work function.
	 * @param arg1 - Work function, or an apply function when `arg2` is provided.
	 * @param arg2 - Optional work function when using the (apply, fn) overload.
	 * @returns The value returned by the work function, if any.
	 *
	 * @example
	 * const out = await container.using(async (scope) => {
	 *   scope.set(A, 41)
	 *   return scope.resolve(A) + 1
	 * }) // => 42
	 */
	async using(
		arg1: ((scope: Container) => unknown) | ((scope: Container) => Promise<unknown>),
		arg2?: ((scope: Container) => unknown) | ((scope: Container) => Promise<unknown>),
	): Promise<unknown> {
		const scope = this.createChild()
		try {
			if (arg2) {
				await Promise.resolve(arg1(scope))
				return await arg2(scope)
			}
			return await arg1(scope)
		}
		finally { await scope.destroy() }
	}

	/** Destroy owned Lifecycle instances (stop if needed, then destroy). Idempotent. */
	async destroy(): Promise<void> {
		if (this.destroyed) return
		this.destroyed = true
		const errors: Error[] = []
		for (const key of this.#registry.list()) {
			const reg = this.#registry.get(key)
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
			this.diagnostic.aggregate('ORK1016', errors, { scope: 'container', message: 'Errors during container destroy', helpUrl: HELP.errors })
		}
	}

	// ---------------------------
	// Internals
	// ---------------------------

	/**
	 * Lookup a registration by token, searching parent containers as needed.
	 * @param token
	 * @returns -
	 */
	private lookup<T>(token: Token<T>): Registration<T> | undefined {
		const here = this.#registry.get(token)
		if (here && this.isRegistrationOf(here, token)) return here
		return this.parent?.lookup(token)
	}

	/**
	 * Narrow a registration to its token type by identity.
	 * @param reg
	 * @param token
	 * @returns -
	 */
	private isRegistrationOf<T>(reg: Registration<unknown>, token: Token<T>): reg is Registration<T> {
		return reg.token === token
	}

	/**
	 * Resolve or instantiate a provider tied to a registration (memoized).
	 * @param reg
	 * @returns -
	 */
	private materialize<T>(reg: Registration<T>): ResolvedProvider<T> {
		if (reg.resolved) return reg.resolved
		const resolved = this.instantiate(reg.provider)
		reg.resolved = resolved
		return resolved
	}

	/**
	 * Instantiate a provider (value/factory/class) and wrap lifecycle if present.
	 * @param provider
	 * @returns -
	 */
	private instantiate<T>(provider: Provider<T>): ResolvedProvider<T> {
		// Raw value branch first (strict non-provider object)
		if (isRawProviderValue(provider)) {
			return this.wrapLifecycle(provider, false)
		}

		if (isValueProvider(provider)) return this.wrapLifecycle(provider.useValue, false)

		if (isFactoryProvider(provider)) {
			if (isFactoryProviderWithTuple<T, readonly unknown[]>(provider)) {
				const args = provider.inject.map(tk => this.resolve(tk))
				return this.wrapLifecycle(provider.useFactory(...args), true)
			}
			if (isFactoryProviderWithObject(provider)) {
				const deps = this.resolve(provider.inject)
				return this.wrapLifecycle(provider.useFactory(deps), true)
			}
			if (isFactoryProviderWithContainer<T>(provider)) {
				return this.wrapLifecycle(provider.useFactory(this), true)
			}
			if (isFactoryProviderNoDeps<T>(provider)) {
				return this.wrapLifecycle(provider.useFactory(), true)
			}
		}

		if (isClassProvider(provider)) {
			if (isClassProviderWithTuple<T, readonly unknown[]>(provider)) {
				const args = provider.inject.map(tk => this.resolve(tk))
				return this.wrapLifecycle(new provider.useClass(...args), true)
			}
			if (isClassProviderWithObject<T>(provider)) {
				const deps = this.resolve(provider.inject)
				return this.wrapLifecycle(new provider.useClass(deps), true)
			}
			if (isClassProviderWithContainer<T>(provider)) {
				return this.wrapLifecycle(new provider.useClass(this), true)
			}
			if (isClassProviderNoDeps<T>(provider)) {
				return this.wrapLifecycle(new provider.useClass(), true)
			}
		}

		// Fallback invariant: should be covered by branches
		this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: unknown provider shape' })
	}

	/**
	 * Wrap a value with lifecycle metadata when it is a Lifecycle.
	 * @param value
	 * @param disposable
	 * @returns -
	 */
	private wrapLifecycle<T>(value: T, disposable: boolean): ResolvedProvider<T> {
		return value instanceof Lifecycle ? { value, lifecycle: value, disposable } : { value, disposable }
	}

	/** Ensure the container hasn't been destroyed before mutating state. */
	private assertNotDestroyed(): void {
		if (this.destroyed) {
			this.#diagnostic.fail('ORK1005', { scope: 'container', message: 'Container already destroyed', helpUrl: HELP.container })
		}
	}

	/**
	 * Consolidated map retrieval for resolve()/get() (strict toggles error behavior).
	 * @param tokens
	 * @param strict
	 * @returns -
	 */
	private retrievalMap(tokens: TokenRecord, strict: boolean): Record<string, unknown> {
		const out: Record<string, unknown> = {}
		for (const key of Object.keys(tokens)) {
			const tk = tokens[key]
			const reg = this.lookup(tk)
			if (!reg) {
				if (strict) {
					this.#diagnostic.fail('ORK1006', { scope: 'container', message: `No provider for ${tokenDescription(tk)}`, helpUrl: HELP.providers })
				}
				out[key] = undefined
				continue
			}
			out[key] = this.materialize(reg).value
		}
		return out
	}
}

// ---------------------------
// Global container registry helper (orchestrator-style getter)
// ---------------------------

const containerRegistry = new RegistryAdapter<Container>({ label: 'container', default: { value: new Container() } })

function containerResolve<T>(token: Token<T>, name?: string | symbol): T
function containerResolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): ResolvedMap<TMap>
function containerResolve<O extends Record<string, unknown>>(tokens: InjectObject<O>, name?: string | symbol): O
function containerResolve(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (isTokenRecord(tokenOrMap)) return c.resolve(tokenOrMap)
	if (isToken(tokenOrMap)) return c.resolve(tokenOrMap)
	containerRegistry.diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: container.resolve called with invalid argument' })
}

function containerGet<T>(token: Token<T>, name?: string | symbol): T | undefined
function containerGet<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): OptionalResolvedMap<TMap>
function containerGet(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (isTokenRecord(tokenOrMap)) return c.get(tokenOrMap)
	if (isToken(tokenOrMap)) return c.get(tokenOrMap)
	containerRegistry.diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: container.get called with invalid argument' })
}

function containerUsing(fn: (c: Container) => void | Promise<void>, name?: string | symbol): Promise<void>
function containerUsing<T>(fn: (c: Container) => T | Promise<T>, name?: string | symbol): Promise<T>
function containerUsing<T>(apply: (c: Container) => void | Promise<void>, fn: (c: Container) => T | Promise<T>, name?: string | symbol): Promise<T>
function containerUsing(
	arg1: ((c: Container) => unknown) | ((c: Container) => Promise<unknown>),
	arg2?: ((c: Container) => unknown) | ((c: Container) => Promise<unknown>) | (string | symbol),
	arg3?: string | symbol,
): Promise<unknown> {
	const c = containerRegistry.resolve(typeof arg2 === 'function' ? arg3 : arg2)
	if (typeof arg2 === 'function') {
		return c.using(
			async (scope) => { await arg1(scope) },
			scope => arg2(scope),
		)
	}
	return c.using(scope => arg1(scope))
}

/**
 * Global container getter and manager.
 *
 * Usage
 * -----
 * ```ts
 * import { container, createToken } from '@orkestrel/core'
 *
 * const A = createToken<number>('A')
 * container().set(A, 7)
 * const v = container.resolve(A) // 7
 *
 * await container.using(async (scope) => {
 *   scope.set(A, 1)
 *   // scoped registration does not leak
 * })
 * ```
 */
export const container = Object.assign(
	(name?: string | symbol): Container => containerRegistry.resolve(name),
	{
		set(name: string | symbol, c: Container, lock?: boolean): void { containerRegistry.set(name, c, lock) },
		clear(name?: string | symbol, force?: boolean): boolean { return containerRegistry.clear(name, force) },
		list(): (string | symbol)[] { return [...containerRegistry.list()] },
		resolve: containerResolve,
		get: containerGet,
		using: containerUsing,
	},
) satisfies ContainerGetter
