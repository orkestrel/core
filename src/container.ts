import { Lifecycle } from './lifecycle.js'
import { Registry } from './registry.js'
import { AggregateLifecycleError } from './errors.js'

export interface Token<_T> { readonly key: symbol, readonly description: string }
export function createToken<_T = unknown>(description: string): Token<_T> {
	return { key: Symbol(description), description }
}

export interface ValueProvider<T> { useValue: T }
export interface FactoryProvider<T> { useFactory: (c: Container) => T }
export interface ClassProvider<T> { useClass: new (c: Container) => T }
export type Provider<T> = ValueProvider<T> | FactoryProvider<T> | ClassProvider<T> | T

interface ResolvedProvider<T> { value: T, lifecycle?: Lifecycle, disposable: boolean }
interface Registration<T> { token: Token<T>, provider: Provider<T>, resolved?: ResolvedProvider<T> }

export interface ContainerOptions { parent?: Container }

export class Container {
	private readonly registry = new Map<symbol, Registration<unknown>>()
	private readonly parent?: Container
	private destroyed = false

	constructor(opts: ContainerOptions = {}) { this.parent = opts.parent }

	register<T>(token: Token<T>, provider: Provider<T>): this {
		this.assertNotDestroyed()
		this.registry.set(token.key, { token, provider })
		return this
	}

	set<T>(token: Token<T>, value: T): void { this.register(token, { useValue: value }) }

	has<T>(token: Token<T>): boolean {
		return this.registry.has(token.key) || (this.parent?.has(token) ?? false)
	}

	get<T>(token: Token<T>): T {
		const reg = this.lookup(token)
		if (!reg) throw new Error(`No provider for ${token.description}`)
		return this.materialize(reg).value as T
	}

	tryGet<T>(token: Token<T>): T | undefined {
		const reg = this.lookup(token)
		return reg ? (this.materialize(reg).value as T) : undefined
	}

	createChild(): Container { return new Container({ parent: this }) }

	async destroy(): Promise<void> {
		if (this.destroyed) return
		this.destroyed = true
		const errors: Error[] = []
		for (const reg of this.registry.values()) {
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
			throw new AggregateLifecycleError('Errors during container destroy', errors)
		}
	}

	private lookup<T>(token: Token<T>): Registration<T> | undefined {
		return (this.registry.get(token.key) as Registration<T> | undefined) ?? this.parent?.lookup(token)
	}

	private materialize<T>(reg: Registration<T>): ResolvedProvider<T> {
		if (reg.resolved) return reg.resolved
		const resolved = this.instantiate(reg.provider as Provider<T>)
		reg.resolved = resolved
		return resolved
	}

	private instantiate<T>(provider: Provider<T>): ResolvedProvider<T> {
		if (this.isValueProvider(provider)) return this.wrapLifecycle(provider.useValue, false)
		if (this.isFactoryProvider(provider)) return this.wrapLifecycle(provider.useFactory(this), true)
		if (this.isClassProvider(provider)) return this.wrapLifecycle(new provider.useClass(this), true)
		return this.wrapLifecycle(provider as T, false)
	}

	private isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> { return typeof p === 'object' && p !== null && Object.hasOwn(p as object, 'useValue') }
	private isFactoryProvider<T>(p: Provider<T>): p is FactoryProvider<T> { return typeof p === 'object' && p !== null && Object.hasOwn(p as object, 'useFactory') }
	private isClassProvider<T>(p: Provider<T>): p is ClassProvider<T> { return typeof p === 'object' && p !== null && Object.hasOwn(p as object, 'useClass') }

	private wrapLifecycle<T>(value: T, disposable: boolean): ResolvedProvider<T> {
		return value instanceof Lifecycle ? { value, lifecycle: value, disposable } : { value, disposable }
	}

	private assertNotDestroyed(): void { if (this.destroyed) throw new Error('Container already destroyed') }
}

export type TokensOf<T extends Record<string, unknown>> = { [K in keyof T & string]: Token<T[K]> }
export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): TokensOf<T> {
	const out: Partial<Record<keyof T & string, Token<unknown>>> = {}
	for (const key of Object.keys(shape) as (keyof T & string)[]) out[key] = createToken(`${namespace}:${key}`)
	return out as TokensOf<T>
}

export type ContainerGetter = {
	(name?: string | symbol): Container
	set(c: Container, name?: string | symbol): void
	clear(name?: string | symbol): boolean
	list(): (string | symbol)[]
}

const DEFAULT_CONTAINER_KEY = Symbol('container.default')
const containerRegistry = new Registry<Container>('container', DEFAULT_CONTAINER_KEY)

export const container: ContainerGetter = Object.assign(
	(name?: string | symbol): Container => containerRegistry.get(name),
	{
		set(c: Container, name?: string | symbol) {
			if (name === undefined) containerRegistry.setDefault(c)
			else containerRegistry.set(name, c)
		},
		clear(name?: string | symbol) { return containerRegistry.clear(name) },
		list() { return containerRegistry.list() },
	},
)
