import { Lifecycle } from './lifecycle.js'
import { Registry } from './registry.js'
import { AggregateLifecycleError, D } from './diagnostics.js'

export interface Token<_T> { readonly key: symbol, readonly description: string }

// Private brand to harden token guards at runtime
const TOKEN_BRAND: unique symbol = Symbol('token.brand')

export function createToken<_T = unknown>(description: string): Token<_T> {
	// Freeze and brand tokens to prevent mutation and spoofing
	const tok = { key: Symbol(description), description, __brand: TOKEN_BRAND } as const
	return Object.freeze(tok) as unknown as Token<_T>
}

// ---------------------------
// Provider type definitions
// ---------------------------

export interface ValueProvider<T> { useValue: T }

// Inject helpers
export type InjectTuple<A extends readonly unknown[]> = { [K in keyof A]: Token<A[K]> }
export type InjectObject<O extends Record<string, unknown>> = { [K in keyof O]: Token<O[K]> }

// Factory providers
export type FactoryProviderNoDeps<T> = { useFactory: () => T } | { useFactory: (container: Container) => T }
export type FactoryProviderWithTuple<T, A extends readonly unknown[]> = { useFactory: (...args: A) => T, inject: InjectTuple<A> }
export type FactoryProviderWithObject<T, O extends Record<string, unknown>> = { useFactory: (deps: O) => T, inject: InjectObject<O> }
export type FactoryProvider<T> = FactoryProviderNoDeps<T> | FactoryProviderWithTuple<T, readonly unknown[]> | FactoryProviderWithObject<T, Record<string, unknown>>

// Class providers
export type CtorNoDeps<T> = new () => T
export type CtorWithContainer<T> = new (container: Container) => T
export type ClassProviderNoDeps<T> = { useClass: CtorNoDeps<T> | CtorWithContainer<T> }
export type ClassProviderWithTuple<T, A extends readonly unknown[]> = { useClass: new (...args: A) => T, inject: InjectTuple<A> }
export type ClassProvider<T> = ClassProviderNoDeps<T> | ClassProviderWithTuple<T, readonly unknown[]>

// Narrowable provider object types
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

// Runtime token guard
function isToken(x: unknown): x is Token<unknown> {
	if (typeof x !== 'object' || x === null) return false
	if (!hasOwn(x, 'key')) return false
	const key = (x as Record<string, unknown>).key
	if (typeof key !== 'symbol') return false
	if (!hasOwn(x, 'description')) return false
	const desc = (x as Record<string, unknown>).description
	if (typeof desc !== 'string') return false
	if (!hasOwn(x, '__brand')) return false
	const brand = (x as Record<string, unknown>).__brand
	return brand === TOKEN_BRAND
}

// ---------------------------
// Typing helpers for token maps
// ---------------------------

type TokenRecord = Record<string, Token<unknown>>
export type TokensOf<T extends Record<string, unknown>> = { [K in keyof T & string]: Token<T[K]> }

type ResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }

type OptionalResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }

export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): TokensOf<T> {
	const out: Partial<Record<keyof T & string, Token<unknown>>> = {}
	for (const key of Object.keys(shape) as (keyof T & string)[]) out[key] = createToken(`${namespace}:${key}`)
	return out as TokensOf<T>
}

// ---------------------------
// Container implementation
// ---------------------------

export interface ContainerOptions { parent?: Container }

export class Container {
	private readonly registry = new Registry<Registration<unknown>>('provider')
	private readonly parent?: Container
	private destroyed = false

	constructor(opts: ContainerOptions = {}) { this.parent = opts.parent }

	// Concise overload set for strong contextual typing
	register<T, A extends readonly unknown[]>(token: Token<T>, provider: FactoryProviderWithTuple<T, A> | ClassProviderWithTuple<T, A>, lock?: boolean): this
	register<T, O extends Record<string, unknown>>(token: Token<T>, provider: FactoryProviderWithObject<T, O>, lock?: boolean): this
	register<T>(token: Token<T>, provider: T | ValueProvider<T> | FactoryProviderNoDeps<T> | ClassProviderNoDeps<T>, lock?: boolean): this
	register<T>(token: Token<T>, provider: Provider<T>, lock?: boolean): this {
		this.assertNotDestroyed()
		this.registry.set(token.key, { token, provider } as Registration<T>, lock)
		return this
	}

	set<T>(token: Token<T>, value: T, lock?: boolean): void { this.register(token, { useValue: value }, lock) }

	has<T>(token: Token<T>): boolean {
		return !!this.registry.get(token.key) || (this.parent?.has(token) ?? false)
	}

	resolve<T>(token: Token<T>): T
	resolve<TMap extends TokenRecord>(tokens: TMap): ResolvedMap<TMap>
	resolve(tokenOrMap: Token<unknown> | TokenRecord): unknown {
		if (isToken(tokenOrMap)) {
			return this.resolveOne(tokenOrMap)
		}
		const tokens = tokenOrMap
		const out: Record<string, unknown> = {}
		for (const key of Object.keys(tokens)) {
			out[key] = this.resolveOne(tokens[key])
		}
		return out
	}

	get<T>(token: Token<T>): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap): OptionalResolvedMap<TMap>
	get(tokenOrMap: Token<unknown> | TokenRecord): unknown {
		if (isToken(tokenOrMap)) {
			return this.getOne(tokenOrMap)
		}
		const tokens = tokenOrMap
		const out: Record<string, unknown> = {}
		for (const key of Object.keys(tokens)) {
			out[key] = this.getOne(tokens[key])
		}
		return out
	}

	createChild(): Container { return new Container({ parent: this }) }

	async using<T>(fn: (scope: Container) => Promise<T> | T): Promise<T> {
		const scope = this.createChild()
		try {
			return await fn(scope)
		}
		finally {
			await scope.destroy()
		}
	}

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
		return (this.registry.get(token.key) as Registration<T> | undefined) ?? this.parent?.lookup(token)
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

	private resolveOne<T>(token: Token<T>): T {
		const reg = this.lookup(token)
		if (!reg) throw D.containerNoProvider(token.description)
		return this.materialize(reg).value
	}

	private getOne<T>(token: Token<T>): T | undefined {
		const reg = this.lookup(token)
		return reg ? this.materialize(reg).value : undefined
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

export type ContainerGetter = {
	(name?: string | symbol): Container
	set(name: string | symbol, c: Container, lock?: boolean): void
	clear(name?: string | symbol, force?: boolean): boolean
	list(): (string | symbol)[]

	resolve<T>(token: Token<T>, name?: string | symbol): T
	resolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): ResolvedMap<TMap>

	get<T>(token: Token<T>, name?: string | symbol): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): OptionalResolvedMap<TMap>

	using<T>(fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T>
}

const containerRegistry = new Registry<Container>('container', new Container())

function containerResolve<T>(token: Token<T>, name?: string | symbol): T
function containerResolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): ResolvedMap<TMap>
function containerResolve(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (isToken(tokenOrMap)) {
		return c.resolve(tokenOrMap)
	}
	return c.resolve(tokenOrMap)
}

function containerGet<T>(token: Token<T>, name?: string | symbol): T | undefined
function containerGet<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): OptionalResolvedMap<TMap>
function containerGet(tokenOrMap: Token<unknown> | TokenRecord, name?: string | symbol): unknown {
	const c = containerRegistry.resolve(name)
	if (isToken(tokenOrMap)) {
		return c.get(tokenOrMap)
	}
	return c.get(tokenOrMap)
}

function containerUsing<T>(fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T> {
	const c = containerRegistry.resolve(name)
	return c.using(fn)
}

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
