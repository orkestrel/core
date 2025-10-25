import type { Adapter } from './adapter.js'
import { RegistryAdapter } from './adapters/registry.js'
import { CONTAINER_MESSAGES, HELP } from './constants.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import type {
	AdapterProvider,
	AdapterSubclass,
	DiagnosticPort,
	LoggerPort,
	Registration,
	ResolvedProvider,
	Token,
	ContainerOptions,
} from './types.js'
import {
	tokenDescription,
	isAdapterProvider,
} from './helpers.js'
import { LoggerAdapter } from './adapters/logger'

/**
 * Minimal, strongly-typed DI container for Adapter classes.
 *
 * Features
 * - Register Adapter classes under token keys.
 * - Resolve tokens to Adapter singleton instances.
 * - Create child scopes that inherit providers; use using() to run scoped work with auto cleanup.
 * - Destroy lifecycle-owning instances deterministically via static methods.
 *
 * @example
 * ```ts
 * import { Container, createToken } from '@orkestrel/core'
 *
 * class HttpServer extends Adapter {
 *   protected async onStart() { }
 *   protected async onStop() { }
 * }
 *
 * const ServerToken = createToken<HttpServer>('Server')
 * const c = new Container()
 * c.register(ServerToken, { adapter: HttpServer })
 *
 * const server = c.resolve(ServerToken) // HttpServer instance (singleton)
 *
 * await c.destroy() // calls HttpServer.stop(), HttpServer.destroy()
 * ```
 */
export class Container {
	#destroyed = false

	readonly #registry: RegistryAdapter<Registration<Adapter>>
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
		this.#registry = new RegistryAdapter<Registration<Adapter>>({ label: 'provider', logger: this.#logger, diagnostic: this.#diagnostic })
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

	/**
	 * Register an Adapter class under a token.
	 *
	 * @typeParam T - Adapter instance type.
	 * @param token - The unique token to associate with the Adapter class.
	 * @param provider - The AdapterProvider containing the Adapter class.
	 * @param lock - When true, prevents re-registration for the same token.
	 * @returns This container for chaining.
	 *
	 * @example
	 * ```ts
	 * class MyAdapter extends Adapter {}
	 * container.register(AdapterToken, { adapter: MyAdapter })
	 * ```
	 */
	register<T extends Adapter>(token: Token<T>, provider: AdapterProvider<T>, lock?: boolean): this {
		this.#assertNotDestroyed()
		if (!isAdapterProvider(provider)) {
			this.#diagnostic.fail('ORK1007', { scope: 'container', message: `Provider for ${tokenDescription(token)} must be an AdapterProvider ({ adapter: AdapterClass })`, helpUrl: HELP.providers })
		}
		this.#registry.set(token, { token, provider }, lock)
		return this
	}

	/**
	 * Check if a provider is available for the token (searches parent containers).
	 *
	 * @typeParam T - Adapter type
	 * @param token - The token to check
	 * @returns True if a provider is registered for the token, false otherwise
	 *
	 * @example
	 * ```ts
	 * if (container.has(AdapterToken)) {
	 *   const adapter = container.resolve(AdapterToken)
	 * }
	 * ```
	 */
	has<T extends Adapter>(token: Token<T>): boolean {
		return !!this.#registry.get(token) || (this.#parent?.has(token) ?? false)
	}

	/**
	 * Strictly resolve a token to its Adapter singleton instance. Missing tokens cause ORK1006 failures.
	 *
	 * @param token - Token to resolve
	 * @returns The Adapter singleton instance for the registered Adapter class
	 *
	 * @example
	 * ```ts
	 * const server = container.resolve(ServerToken) // HttpServer instance
	 * ```
	 */
	resolve<T extends Adapter>(token: Token<T>): T {
		const reg = this.#lookup(token)
		if (!reg) {
			this.#diagnostic.fail('ORK1006', { scope: 'container', message: `No provider for ${tokenDescription(token)}`, helpUrl: HELP.providers })
		}
		return this.#materialize(reg).value
	}

	/**
	 * Optionally resolve a token to its Adapter singleton instance; missing tokens return undefined.
	 *
	 * @param token - Token to get
	 * @returns The Adapter singleton instance or undefined
	 *
	 * @example
	 * ```ts
	 * const maybeServer = container.get(ServerToken) // HttpServer | undefined
	 * ```
	 */
	get<T extends Adapter>(token: Token<T>): T | undefined {
		const reg = this.#lookup(token)
		return reg ? this.#materialize(reg).value : undefined
	}

	/**
	 * Create a child container that inherits providers from this container.
	 *
	 * @returns A new Container instance with this container as its parent
	 *
	 * @example
	 * ```ts
	 * const child = container.createChild()
	 * child.register(OverrideToken, { adapter: OverrideAdapter })
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
	 * await container.using(async (scope) => {
	 *   scope.register(TestAdapter, { adapter: TestAdapter })
	 *   // child scope destroyed automatically
	 * })
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
	 * Destroy owned Adapter instances via static methods (stop if needed, then destroy).
	 *
	 * Idempotent - safe to call multiple times. Iterates through all registered Adapter classes,
	 * calls their static stop() and destroy() methods as needed.
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
			if (resolved?.lifecycle) {
				const AdapterClass = resolved.lifecycle
				try {
					const state = AdapterClass.getState()
					if (state === 'started') await AdapterClass.stop()
					if (state !== 'destroyed') await AdapterClass.destroy()
				}
				catch (e) { errors.push(e instanceof Error ? e : new Error(String(e))) }
			}
		}
		if (errors.length) {
			this.diagnostic.aggregate('ORK1016', errors, { scope: 'container', message: 'Errors during container destroy', helpUrl: HELP.errors })
		}
	}

	// Lookup a registration by token, searching parent containers as needed.
	#lookup<T extends Adapter>(token: Token<T>): Registration<T> | undefined {
		const here = this.#registry.get(token)
		if (here && this.#isRegistrationOf(here, token)) return here
		return this.#parent ? this.#parent.#lookup(token) : undefined
	}

	// Narrow a registration to its token type by identity.
	#isRegistrationOf<T extends Adapter>(reg: Registration<Adapter>, token: Token<T>): reg is Registration<T> {
		return reg.token === token
	}

	// Resolve or instantiate a provider tied to a registration (memoized).
	#materialize<T extends Adapter>(reg: Registration<T>): ResolvedProvider<T> {
		if (reg.resolved) return reg.resolved
		const provider = reg.provider
		if (!isAdapterProvider(provider)) {
			this.#diagnostic.fail('ORK1099', { scope: 'internal', message: 'Invariant: provider is not an AdapterProvider' })
		}
		// Get the singleton instance from the Adapter class
		const instance = provider.adapter.getInstance() as T
		const resolved: ResolvedProvider<T> = {
			value: instance,
			lifecycle: provider.adapter as T extends Adapter ? AdapterSubclass<T> : never,
			disposable: true,
		}
		reg.resolved = resolved
		return resolved
	}

	// Ensure the container hasn't been destroyed before mutating state.
	#assertNotDestroyed(): void {
		if (this.#destroyed) {
			this.#diagnostic.fail('ORK1005', { scope: 'container', message: 'Container already destroyed', helpUrl: HELP.container })
		}
	}
}

const containerRegistry = new RegistryAdapter<Container>({ label: 'container', default: { value: new Container() } })

function containerResolve<T extends Adapter>(token: Token<T>, name?: string | symbol): T {
	const c = containerRegistry.resolve(name)
	return c.resolve(token)
}

function containerGet<T extends Adapter>(token: Token<T>, name?: string | symbol): T | undefined {
	const c = containerRegistry.resolve(name)
	return c.get(token)
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
 * class MyAdapter extends Adapter {}
 * const A = createToken<MyAdapter>('A')
 * container().register(A, { adapter: MyAdapter })
 * const adapter = container.resolve(A)
 *
 * await container.using(async (scope) => {
 *   scope.register(A, { adapter: AnotherAdapter })
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
)
