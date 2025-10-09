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
import { LoggerAdapter } from './adapters/logger.js'

/**
 * Minimal, strongly-typed DI container.
 *
 * - Registers providers (value, factory, class) under Tokens.
 * - Resolves single tokens or token maps strictly (resolve) or optionally (get).
 * - Supports child scopes and scoped work via using.
 * - Destroys owned lifecycles on destroy().
 */
export class Container {
	readonly #registry: RegistryAdapter<Registration<unknown>>
	private readonly parent?: Container
	private destroyed = false
	readonly #diagnostic: DiagnosticPort
	readonly #logger: LoggerPort

	constructor(opts: ContainerOptions = {}) {
		this.parent = opts.parent
		this.#logger = opts.logger ?? new LoggerAdapter()
		this.#diagnostic = opts.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: CONTAINER_MESSAGES })
		this.#registry = new RegistryAdapter<Registration<unknown>>({ label: 'provider', logger: this.#logger, diagnostic: this.#diagnostic })
	}

	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	get logger(): LoggerPort { return this.#logger }

	// Concise overload set for strong contextual typing
	register<T, A extends readonly unknown[]>(token: Token<T>, provider: FactoryProviderWithTuple<T, A> | ClassProviderWithTuple<T, A>, lock?: boolean): this
	register<T, O extends Record<string, unknown>>(token: Token<T>, provider: FactoryProviderWithObject<T, O> | ClassProviderWithObject<T, O>, lock?: boolean): this
	register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, lock?: boolean): this
	/**
	 * Register a provider under a token.
	 * @param token - The unique token.
	 * @param provider - The provider (value/factory/class) or raw value.
	 * @param lock - When true, prevents re-registration for the same token.
	 */
	register<T>(token: Token<T>, provider: Provider<T>, lock?: boolean): this {
		this.assertNotDestroyed()
		this.#registry.set(token, { token, provider }, lock)
		return this
	}

	/** Shorthand for registering a value provider. */
	set<T>(token: Token<T>, value: T, lock?: boolean): void { this.register(token, { useValue: value }, lock) }

	/** Returns true when a provider is available for the token (searches parents). */
	has<T>(token: Token<T>): boolean {
		return !!this.#registry.get(token) || (this.parent?.has(token) ?? false)
	}

	// ---------------------------
	// Strict resolve: token | token map | inject object
	// ---------------------------

	resolve<T>(token: Token<T>): T
	resolve<TMap extends TokenRecord>(tokens: TMap): ResolvedMap<TMap>
	resolve<O extends Record<string, unknown>>(tokens: InjectObject<O>): O
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

	get<T>(token: Token<T>): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap): OptionalResolvedMap<TMap>
	/** Optionally resolve a single token or a map of tokens (missing entries return undefined). */
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

	// Overloads: using(fn) and using(apply, fn)
	async using(fn: (scope: Container) => void | Promise<void>): Promise<void>
	async using<T>(fn: (scope: Container) => T | Promise<T>): Promise<T>
	async using<T>(apply: (scope: Container) => void | Promise<void>, fn: (scope: Container) => T | Promise<T>): Promise<T>
	/**
	 * Run work inside an automatically destroyed child scope.
	 * - using(fn): create child, run fn(child), destroy child.
	 * - using(apply, fn): create child, run apply(child) to register overrides, then fn(child), destroy child.
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

	/** Destroy owned lifecycles (stop if needed, then destroy). Idempotent. */
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

	private lookup<T>(token: Token<T>): Registration<T> | undefined {
		const here = this.#registry.get(token)
		if (here && this.isRegistrationOf(here, token)) return here
		return this.parent?.lookup(token)
	}

	private isRegistrationOf<T>(reg: Registration<unknown>, token: Token<T>): reg is Registration<T> {
		return reg.token === token
	}

	private materialize<T>(reg: Registration<T>): ResolvedProvider<T> {
		if (reg.resolved) return reg.resolved
		const resolved = this.instantiate(reg.provider)
		reg.resolved = resolved
		return resolved
	}

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

	private wrapLifecycle<T>(value: T, disposable: boolean): ResolvedProvider<T> {
		return value instanceof Lifecycle ? { value, lifecycle: value, disposable } : { value, disposable }
	}

	private assertNotDestroyed(): void {
		if (this.destroyed) {
			this.#diagnostic.fail('ORK1005', { scope: 'container', message: 'Container already destroyed', helpUrl: HELP.container })
		}
	}

	// Consolidated map retrieval for resolve()/get()
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
 * Global container instance.
 *
 * - The default container instance is created automatically.
 * - Use `container.set()` to register additional containers or overrides.
 * - Use `container.resolve()` or `container.get()` to retrieve instances.
 * - Use `container.using()` to run scoped work with automatic cleanup.
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
