import { Adapter } from './adapter.js'
import { RegistryAdapter } from './adapters/registry.js'
import { CONTAINER_MESSAGES, HELP } from './constants.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import type {
	AdapterProvider,
	ClassProviderNoDeps,
	ClassProviderWithObject,
	ClassProviderWithTuple,
	ContainerOptions,
	DiagnosticPort,
	FactoryProviderNoDeps,
	FactoryProviderWithObject,
	FactoryProviderWithTuple,
	InjectObject,
	InjectTuple,
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
	isToken,
	isTokenArray,
	isTokenRecord,
	tokenDescription,
	matchProvider,
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
 * @example
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
 * await c.destroy() // stops and destroys owned Adapter instances
 * ```
 */
export class Container {
	#destroyed = false

	readonly #registry: RegistryAdapter<Registration<unknown>>
	readonly #parent?: Container
	readonly #diagnostic: DiagnosticPort
	readonly #logger: LoggerPort

	/**
	 * Construct a Container with optional parent, logger, and diagnostic adapters.
	 *
	 * @param opts - Configuration options:
	 * - parent: Optional parent container to inherit providers from
	 * - logger: Optional logger port for diagnostics
	 * - diagnostic: Optional diagnostic port for error reporting
	 *
	 */
	constructor(opts: ContainerOptions = {}) {
		this.#parent = opts.parent
		this.#logger = opts.logger ?? new LoggerAdapter()
		this.#diagnostic = opts.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: CONTAINER_MESSAGES })
		this.#registry = new RegistryAdapter<Registration<unknown>>({ label: 'provider', logger: this.#logger, diagnostic: this.#diagnostic })
	}

	/**
	 * Access the diagnostic port used by this container.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/**
	 * Access the logger port used by this container.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	// Overload: register with tuple-injected factory/class providers.
	register<T, A extends readonly unknown[]>(token: Token<T>, provider: FactoryProviderWithTuple<T, A> | ClassProviderWithTuple<T, A>, lock?: boolean): this
	// Overload: register with object-injected factory/class providers.
	register<T, O extends Record<string, unknown>>(token: Token<T>, provider: FactoryProviderWithObject<T, O> | ClassProviderWithObject<T, O>, lock?: boolean): this
	// Overload: register with no-deps/class-or-factory-or-value providers.
	register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, lock?: boolean): this
	/**
	 * Register a provider under a token.
	 *
	 * Supported shapes
	 * - Value: `{ useValue }`
	 * - Factory: `{ useFactory }` with optional inject tuple/object or container arg
	 * - Class: `{ useClass }` with optional inject tuple/object or container arg
	 *
	 * @typeParam T - Token value type.
	 * @param token - The unique token to associate with the provider.
	 * @param provider - The provider object or raw value.
	 * @param lock - When true, prevents re-registration for the same token.
	 * @returns This container for chaining.
	 *
	 * @example
	 * ```ts
	 * // value
	 * container.register(Port, { useValue: impl })
	 * // factory with tuple inject
	 * container.register(Port, { useFactory: (a, b) => make(a, b), inject: [A, B] })
	 * // class with object inject
	 * container.register(Port, { useClass: Impl, inject: { a: A, b: B } })
	 * // lock to prevent override
	 * container.register(Port, { useValue: impl }, true)
	 * ```
	 */
	register<T>(token: Token<T>, provider: Provider<T>, lock?: boolean): this {
		this.#assertNotDestroyed()
		this.#registry.set(token, { token, provider }, lock)
		return this
	}

	/**
	 * Shorthand for registering a value provider.
	 *
	 * @typeParam T - Token value type
	 * @param token - The token to register the value under
	 * @param value - The value to register
	 * @param lock - When true, prevents re-registration for this token (default: false)
     * @returns void
	 *
	 * @example
	 * ```ts
	 * container.set(ConfigToken, { apiUrl: 'https://api.example.com' })
	 * ```
	 */
	set<T>(token: Token<T>, value: T, lock?: boolean): void { this.register(token, { useValue: value }, lock) }

	/**
	 * Check if a provider is available for the token (searches parent containers).
	 *
	 * @typeParam T - Token value type
	 * @param token - The token to check
	 * @returns True if a provider is registered for the token, false otherwise
	 *
	 * @example
	 * ```ts
	 * if (container.has(ConfigToken)) {
	 *   const config = container.resolve(ConfigToken)
	 * }
	 * ```
	 */
	has<T>(token: Token<T>): boolean {
		return !!this.#registry.get(token) || (this.#parent?.has(token) ?? false)
	}

	// Overload: resolve a single token strictly.
	resolve<T>(token: Token<T>): T
	// Overload: resolve an inject object to a plain object.
	resolve<O extends Record<string, unknown>>(tokens: InjectObject<O>): O
	// Overload: resolve an inject tuple to a tuple of values.
	resolve<A extends readonly unknown[]>(tokens: InjectTuple<A>): A
	// Overload: resolve a token map to a map of values.
	resolve<TMap extends TokenRecord>(tokens: TMap): ResolvedMap<TMap>
	/**
	 * Strictly resolve a single token or a token map. Missing tokens cause ORK1006 failures.
	 *
	 * @param tokenOrMap - Token to resolve, or a record of tokens to resolve into a map.
	 * @returns The resolved value for a token, or a map/tuple of resolved values when given a record/tuple.
	 *
	 * @example
	 * ```ts
	 * const { a, b } = container.resolve({ a: A, b: B })
	 * const [a, b] = container.resolve([A, B] as const)
	 * ```
	 */
	resolve(tokenOrMap: Token<unknown> | TokenRecord | ReadonlyArray<Token<unknown>>): unknown {
		if (isToken(tokenOrMap)) {
			const reg = this.#lookup(tokenOrMap)
			if (!reg) {
				this.#diagnostic.fail('ORK1006', { scope: 'container', message: `No provider for ${tokenDescription(tokenOrMap)}`, helpUrl: HELP.providers })
			}
			return this.#materialize(reg).value
		}
		if (isTokenRecord(tokenOrMap)) {
			return this.#retrievalMap(tokenOrMap, true)
		}
		if (isTokenArray(tokenOrMap)) {
			return this.#retrievalTuple(tokenOrMap, true)
		}
		this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: resolve() called with invalid argument' })
	}

	// Overload: optionally get a single token.
	get<T>(token: Token<T>): T | undefined
	// Overload: optionally get an inject tuple to a tuple of optional values.
	get<A extends readonly unknown[]>(tokens: InjectTuple<A>): { [K in keyof A]: A[K] | undefined }
	// Overload: optionally get an inject object to a plain object of optional values.
	get<O extends Record<string, unknown>>(tokens: InjectObject<O>): { [K in keyof O]: O[K] | undefined }
	// Overload: optionally get a map of tokens.
	get<TMap extends TokenRecord>(tokens: TMap): OptionalResolvedMap<TMap>
	/**
	 * Optionally resolve a single token or a map of tokens; missing entries return undefined.
	 *
	 * @param tokenOrMap - Token to get, or a record/tuple of tokens to get into a map/tuple
	 * @returns The value for a token or undefined, or a map/tuple of values (possibly undefined)
	 *
	 * @example
	 * ```ts
	 * const maybeCfg = container.get(ConfigToken) // T | undefined
	 * const { a, b } = container.get({ a: A, b: B }) // { a?: A, b?: B }
	 * const [a, b] = container.get([A, B] as const) // [A | undefined, B | undefined]
	 * ```
	 */
	get(tokenOrMap: Token<unknown> | TokenRecord | ReadonlyArray<Token<unknown>>): unknown {
		if (isToken(tokenOrMap)) {
			const reg = this.#lookup(tokenOrMap)
			return reg ? this.#materialize(reg).value : undefined
		}
		if (isTokenRecord(tokenOrMap)) {
			return this.#retrievalMap(tokenOrMap, false)
		}
		if (isTokenArray(tokenOrMap)) {
			return this.#retrievalTuple(tokenOrMap, false)
		}
		this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: get() called with invalid argument' })
	}

	/**
	 * Create a child container that inherits providers from this container.
	 *
	 * @returns A new Container instance with this container as its parent
	 *
	 * @example
	 * ```ts
	 * const child = container.createChild()
	 * child.set(OverrideToken, newValue)
	 * ```
	 */
	createChild(): Container { return new Container({ parent: this, diagnostic: this.diagnostic, logger: this.logger }) }

	// Overload: using(fn) - run work in a child scope.
	async using(fn: (scope: Container) => void | Promise<void>): Promise<void>
	// Overload: using(fn) - run work in a child scope, returning a value.
	async using<T>(fn: (scope: Container) => T | Promise<T>): Promise<T>
	// Overload: using(apply, fn) - apply setup, then run work in a child scope.
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
	 * ```ts
	 * const out = await container.using(async (scope) => {
	 *   scope.set(A, 41)
	 *   return scope.resolve(A) + 1
	 * }) // => 42
	 * ```
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

	/**
	 * Destroy owned Adapter instances (stop if needed, then destroy).
	 *
	 * Idempotent - safe to call multiple times. Iterates through all registered instances,
	 * stops any that are started, and destroys all that are disposable.
	 *
	 * @throws AggregateLifecycleError with code ORK1016 if errors occur during destruction
	 *
	 * @example
	 * ```ts
	 * await container.destroy()
	 * ```
	 */
	async destroy(): Promise<void> {
		if (this.#destroyed) return
		this.#destroyed = true
		const errors: Error[] = []
		for (const key of this.#registry.list()) {
			const reg = this.#registry.get(key)
			if (!reg) continue
			const resolved = reg.resolved
			if (resolved?.lifecycle && resolved.disposable) {
				const lc = resolved.lifecycle
				try {
					// Check if lifecycle is an Adapter class (constructor function)
					if (typeof lc === 'function' && lc.prototype instanceof Adapter) {
						// Use static methods for Adapter classes
						const AdapterClass = lc as typeof Adapter
						const state = AdapterClass.getState()
						if (state === 'started') await AdapterClass.stop()
						if (state !== 'destroyed') await AdapterClass.destroy()
					}
					// Otherwise it's an Adapter instance (legacy pattern)
					else if (lc instanceof Adapter) {
						const state = lc.state
						if (state === 'started') await (lc as any).#stop?.() || await (lc.constructor as typeof Adapter).stop()
						if (state !== 'destroyed') await (lc as any).#destroy?.() || await (lc.constructor as typeof Adapter).destroy()
					}
				}
				catch (e) { errors.push(e instanceof Error ? e : new Error(String(e))) }
			}
		}
		if (errors.length) {
			this.diagnostic.aggregate('ORK1016', errors, { scope: 'container', message: 'Errors during container destroy', helpUrl: HELP.errors })
		}
	}

	// Lookup a registration by token, searching parent containers as needed.
	#lookup<T>(token: Token<T>): Registration<T> | undefined {
		const here = this.#registry.get(token)
		if (here && this.#isRegistrationOf(here, token)) return here
		return this.#parent ? this.#parent.#lookup(token) : undefined
	}

	// Narrow a registration to its token type by identity.
	#isRegistrationOf<T>(reg: Registration<unknown>, token: Token<T>): reg is Registration<T> {
		return reg.token === token
	}

	// Resolve or instantiate a provider tied to a registration (memoized).
	#materialize<T>(reg: Registration<T>): ResolvedProvider<T> {
		if (reg.resolved) return reg.resolved
		const resolved = this.#instantiate(reg.provider)
		reg.resolved = resolved
		return resolved
	}

	// Instantiate a provider (value/factory/class) and wrap lifecycle if present.
	#instantiate<T>(provider: Provider<T>): ResolvedProvider<T> {
		return matchProvider(provider, {
			raw: value => this.#wrapLifecycle(value, false),
			value: p => this.#wrapLifecycle(p.useValue, false),
			adapter: p => this.#wrapAdapterClass(p),
			factoryTuple: p => this.#wrapLifecycle(p.useFactory(...this.resolve(p.inject)), true),
			factoryObject: p => this.#wrapLifecycle(p.useFactory(this.resolve(p.inject)), true),
			factoryContainer: p => this.#wrapLifecycle(p.useFactory(this), true),
			factoryNoDeps: p => this.#wrapLifecycle(p.useFactory(), true),
			classTuple: p => this.#wrapLifecycle(new p.useClass(...this.resolve(p.inject)), true),
			classObject: p => this.#wrapLifecycle(new p.useClass(this.resolve(p.inject)), true),
			classContainer: p => this.#wrapLifecycle(new p.useClass(this), true),
			classNoDeps: p => this.#wrapLifecycle(new p.useClass(), true),
		})
	}

	// Wrap an Adapter class (not instantiated) - returns the class itself.
	#wrapAdapterClass<T extends typeof Adapter>(p: AdapterProvider<T>): ResolvedProvider<T> {
		// For AdapterProvider, we return the class itself, not an instance
		// The class is both the value and the lifecycle manager
		return { value: p.adapter as unknown as InstanceType<T>, lifecycle: p.adapter as unknown as Adapter, disposable: true } as ResolvedProvider<T>
	}

	// Wrap a value with lifecycle metadata when it is an Adapter.
	#wrapLifecycle<T>(value: T, disposable: boolean): ResolvedProvider<T> {
		return value instanceof Adapter ? { value, lifecycle: value, disposable } : { value, disposable }
	}

	// Ensure the container hasn't been destroyed before mutating state.
	#assertNotDestroyed(): void {
		if (this.#destroyed) {
			this.#diagnostic.fail('ORK1005', { scope: 'container', message: 'Container already destroyed', helpUrl: HELP.container })
		}
	}

	// Consolidated map retrieval for resolve()/get() (strict toggles error behavior).
	#retrievalMap(tokens: TokenRecord, strict: boolean): Record<string, unknown> {
		const out: Record<string, unknown> = {}
		for (const key of Object.keys(tokens)) {
			const tk = tokens[key]
			const reg = this.#lookup(tk)
			if (!reg) {
				if (strict) {
					this.#diagnostic.fail('ORK1006', { scope: 'container', message: `No provider for ${tokenDescription(tk)}`, helpUrl: HELP.providers })
				}
				out[key] = undefined
				continue
			}
			out[key] = this.#materialize(reg).value
		}
		return out
	}

	// Consolidated tuple retrieval for resolve()/get() when given an array of tokens.
	#retrievalTuple(tokens: ReadonlyArray<Token<unknown>>, strict: boolean): ReadonlyArray<unknown> {
		const out: unknown[] = new Array(tokens.length)
		for (let i = 0; i < tokens.length; i++) {
			const tk = tokens[i]
			const reg = this.#lookup(tk)
			if (!reg) {
				if (strict) {
					this.#diagnostic.fail('ORK1006', { scope: 'container', message: `No provider for ${tokenDescription(tk)}`, helpUrl: HELP.providers })
				}
				out[i] = undefined
				continue
			}
			out[i] = this.#materialize(reg).value
		}
		return out
	}
}

const containerRegistry = new RegistryAdapter<Container>({ label: 'container', default: { value: new Container() } })

function containerResolve<T>(token: Token<T>, name?: string | symbol): T
function containerResolve<O extends Record<string, unknown>>(tokens: InjectObject<O>, name?: string | symbol): O
function containerResolve<A extends readonly unknown[]>(tokens: InjectTuple<A>, name?: string | symbol): A
function containerResolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): ResolvedMap<TMap>
function containerResolve(tokenOrMap: Token<unknown> | TokenRecord | ReadonlyArray<Token<unknown>>, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (isToken(tokenOrMap)) return c.resolve(tokenOrMap)
	if (isTokenRecord(tokenOrMap)) return c.resolve(tokenOrMap)
	if (isTokenArray(tokenOrMap)) return c.resolve(tokenOrMap)
	containerRegistry.diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: container.resolve called with invalid argument' })
}

function containerGet<T>(token: Token<T>, name?: string | symbol): T | undefined
function containerGet<A extends readonly unknown[]>(tokens: InjectTuple<A>, name?: string | symbol): { [K in keyof A]: A[K] | undefined }
function containerGet<O extends Record<string, unknown>>(tokens: InjectObject<O>, name?: string | symbol): { [K in keyof O]: O[K] | undefined }
function containerGet<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): OptionalResolvedMap<TMap>
function containerGet(tokenOrMap: Token<unknown> | TokenRecord | ReadonlyArray<Token<unknown>>, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (isTokenArray(tokenOrMap)) return c.get(tokenOrMap)
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
 * @example
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
