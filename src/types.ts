// Centralized types and helpers shared across the core package
// NOTE: Only import types from other modules to avoid runtime cycles.

import type { Container } from './container.js'
import type { Lifecycle } from './lifecycle.js'
import type { Orchestrator } from './orchestrator.js'

// ---------------------------
// Ports: Emitter (used by Lifecycle)
// ---------------------------

export type EmitterListener<Args extends unknown[] = unknown[]> = (...args: Args) => void

export interface EmitterPort<EMap extends Record<string, unknown[]> = Record<string, unknown[]>> {
	on<E extends keyof EMap & string>(event: E, fn: (...args: EMap[E]) => void): this
	off<E extends keyof EMap & string>(event: E, fn: (...args: EMap[E]) => void): this
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void
	removeAllListeners(): void
}

// ---------------------------
// Ports: Event (topic-based pub/sub)
// ---------------------------

export type EventHandler<T> = (payload: T) => void | Promise<void>

export interface EventPort<EMap extends Record<string, unknown> = Record<string, unknown>> {
	publish<E extends keyof EMap & string>(topic: E, payload: EMap[E]): Promise<void>
	subscribe<E extends keyof EMap & string>(topic: E, handler: EventHandler<EMap[E]>): Promise<() => void | Promise<void>>
	topics(): ReadonlyArray<string>
}

export interface EventAdapterOptions {
	readonly onError?: (err: unknown, topic: string) => void
	readonly sequential?: boolean
}

// ---------------------------
// Ports: Layer (topological layering)
// ---------------------------

export interface LayerNode<T = unknown> {
	readonly token: Token<T>
	readonly dependencies: readonly Token<unknown>[]
}

export interface LayerPort {
	compute<T>(nodes: ReadonlyArray<LayerNode<T>>): Token<T>[][]
	group<T>(tokens: ReadonlyArray<Token<T>>, layers: ReadonlyArray<ReadonlyArray<Token<T>>>): Token<T>[][]
}

// ---------------------------
// Ports: Queue
// ---------------------------

export interface QueuePort<T = unknown> {
	enqueue(item: T): Promise<void>
	dequeue(): Promise<T | undefined>
	size(): Promise<number>
	run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options?: QueueRunOptions): Promise<ReadonlyArray<R>>
}

export interface QueueRunOptions {
	readonly concurrency?: number
	readonly timeout?: number
	/** Shared time budget in milliseconds for the whole run (applies across tasks). */
	readonly deadline?: number
	/** Optional abort signal; if aborted, stops scheduling further tasks and rejects. */
	readonly signal?: AbortSignal
}

export interface QueueAdapterOptions extends QueueRunOptions {
	readonly capacity?: number
}

// ---------------------------
// Ports: Registry
// ---------------------------

export interface RegistryPort<T> {
	get(name?: string | symbol): T | undefined
	resolve(name?: string | symbol): T
	set(name: string | symbol, value: T, lock?: boolean): void
	clear(name?: string | symbol, force?: boolean): boolean
	list(): ReadonlyArray<string | symbol>
}

export interface RegistryAdapterOptions<T> {
	readonly label?: string
	readonly default?: { readonly key?: symbol, readonly value: T }
}

// ---------------------------
// Tokens
// ---------------------------

export type Token<T> = symbol & { readonly __t?: T }

export function createToken<_T = unknown>(description: string): Token<_T> {
	return Symbol(description) as Token<_T>
}

export type TokensOf<T extends Record<string, unknown>> = { [K in keyof T & string]: Token<T[K]> }

export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): Readonly<TokensOf<T>> {
	const out: Partial<Record<keyof T & string, Token<unknown>>> = {}
	for (const key of Object.keys(shape) as (keyof T & string)[]) out[key] = createToken(`${namespace}:${key}`)
	return Object.freeze(out) as Readonly<TokensOf<T>>
}

// Utility token maps used by Container and helpers
export type TokenRecord = Record<string, Token<unknown>>
export type ResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }
export type OptionalResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }

// ---------------------------
// Provider type definitions
// ---------------------------

export interface ValueProvider<T> { readonly useValue: T }

export type InjectTuple<A extends readonly unknown[]> = { readonly [K in keyof A]: Token<A[K]> }
export type InjectObject<O extends Record<string, unknown>> = Readonly<{ [K in keyof O]: Token<O[K]> }>

export type FactoryProviderNoDeps<T>
	= | { readonly useFactory: () => T }
		| { readonly useFactory: (container: Container) => T }

export type FactoryProviderWithTuple<T, A extends readonly unknown[]> = {
	readonly useFactory: (...args: A) => T
	readonly inject: InjectTuple<A>
}

export type FactoryProviderWithObject<T, O extends Record<string, unknown>> = {
	readonly useFactory: (deps: O) => T
	readonly inject: InjectObject<O>
}

export type FactoryProvider<T>
	= | FactoryProviderNoDeps<T>
		| FactoryProviderWithTuple<T, readonly unknown[]>
		| FactoryProviderWithObject<T, Record<string, unknown>>

export type CtorNoDeps<T> = new () => T
export type CtorWithContainer<T> = new (container: Container) => T

export type ClassProviderNoDeps<T> = { readonly useClass: CtorNoDeps<T> | CtorWithContainer<T> }
export type ClassProviderWithTuple<T, A extends readonly unknown[]> = {
	readonly useClass: new (...args: A) => T
	readonly inject: InjectTuple<A>
}
export type ClassProvider<T> = ClassProviderNoDeps<T> | ClassProviderWithTuple<T, readonly unknown[]>

export type Provider<T> = T | ValueProvider<T> | FactoryProvider<T> | ClassProvider<T>

// ---------------------------
// Narrowing helpers (type guards)
// ---------------------------

export function hasOwn<O extends object, K extends PropertyKey>(obj: O, key: K): obj is O & Record<K, unknown> {
	return Object.prototype.hasOwnProperty.call(obj, key)
}

export function isToken(x: unknown): x is Token<unknown> {
	return typeof x === 'symbol'
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

export function isClassProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | ClassProvider<T>): p is ClassProviderWithTuple<T, A> {
	return typeof p === 'object' && p !== null && hasOwn(p, 'useClass') && hasOwn(p, 'inject') && Array.isArray((p as { inject: unknown }).inject)
}

export function isClassProviderNoDeps<T>(p: Provider<T> | ClassProvider<T>): p is ClassProviderNoDeps<T> {
	return isClassProvider(p) && !hasOwn(p as object, 'inject')
}

export function isFactoryProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T>): p is FactoryProviderWithTuple<T, A> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && Array.isArray((p as { inject: unknown }).inject)
}

export function isFactoryProviderWithObject<T>(p: Provider<T>): p is FactoryProviderWithObject<T, Record<string, unknown>> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && !Array.isArray((p as { inject: unknown }).inject)
}

export function isFactoryProviderNoDeps<T>(p: Provider<T>): p is FactoryProviderNoDeps<T> {
	return isFactoryProvider(p) && !hasOwn(p, 'inject')
}

export function isZeroArg<T>(fn: FactoryProviderNoDeps<T>['useFactory']): fn is () => T {
	return fn.length === 0
}

// ---------------------------
// General runtime helpers (safe and shared)
// ---------------------------

export function getTag(x: unknown): string {
	return Object.prototype.toString.call(x)
}

export function isAsyncFunction(fn: unknown): fn is (...args: unknown[]) => Promise<unknown> {
	if (typeof fn !== 'function') return false
	if (getTag(fn) === '[object AsyncFunction]') return true
	const proto = Object.getPrototypeOf(fn)
	const ctorName = typeof proto?.constructor?.name === 'string' ? proto.constructor.name : undefined
	return ctorName === 'AsyncFunction'
}

export function isPromiseLike<T = unknown>(x: unknown): x is PromiseLike<T> {
	if (x == null) return false
	const t = typeof x
	if (t !== 'object' && t !== 'function') return false
	if (getTag(x) === '[object Promise]') return true
	const maybeThen = (x as { then?: unknown }).then
	return typeof maybeThen === 'function'
}

// ---------------------------
// Diagnostics and lifecycle types (shared)
// ---------------------------

export type OrkCode
	= | 'ORK1001' // Registry: no default instance
		| 'ORK1002' // Registry: no named instance
		| 'ORK1003' // Registry: cannot replace default
		| 'ORK1004' // Registry: cannot replace locked
		| 'ORK1005' // Container: already destroyed
		| 'ORK1006' // Container: no provider for token
		| 'ORK1007' // Orchestrator: duplicate registration
		| 'ORK1008' // Orchestrator: unknown dependency
		| 'ORK1009' // Orchestrator: cycle detected
		| 'ORK1010' // Orchestrator: async useValue
		| 'ORK1011' // Orchestrator: async useFactory (async function)
		| 'ORK1012' // Orchestrator: async useFactory (returned Promise)
		| 'ORK1013' // Orchestrator: Errors during start
		| 'ORK1014' // Orchestrator: Errors during stop
		| 'ORK1015' // Orchestrator: Errors during destroyAll
		| 'ORK1016' // Container: Errors during container destroy
		| 'ORK1017' // Orchestrator: Errors during destroy (consolidated stop+destroy)
		| 'ORK1020' // Lifecycle: invalid transition
		| 'ORK1021' // Lifecycle: hook timed out
		| 'ORK1099' // Internal invariant

export interface DiagnosticInfo { code: OrkCode, message: string, helpUrl?: string }

export type LifecyclePhase = 'start' | 'stop' | 'destroy'
export type LifecycleHook = 'create' | 'start' | 'stop' | 'destroy'
export type LifecycleContext = 'normal' | 'rollback' | 'container'
export interface LifecycleErrorDetail {
	tokenDescription: string
	phase: LifecyclePhase
	context: LifecycleContext
	timedOut: boolean
	durationMs: number
	error: Error
}

// Runtime guard for LifecycleErrorDetail (narrowing only; browser/server safe)
export function isLifecycleErrorDetail(x: unknown): x is LifecycleErrorDetail {
	if (typeof x !== 'object' || x === null) return false
	const o = x as Record<string, unknown>
	return (
		typeof o.tokenDescription === 'string'
		&& (o.phase === 'start' || o.phase === 'stop' || o.phase === 'destroy')
		&& (o.context === 'normal' || o.context === 'rollback' || o.context === 'container')
		&& typeof o.timedOut === 'boolean'
		&& typeof o.durationMs === 'number' && Number.isFinite(o.durationMs)
		&& (o.error instanceof Error)
	)
}

// Lifecycle public types
export type LifecycleState = 'created' | 'started' | 'stopped' | 'destroyed'
export interface LifecycleOptions {
	readonly timeouts?: number
	readonly emitInitial?: boolean
	// Emitter remains injectable
	readonly emitter?: EmitterPort<LifecycleEventMap>
	// Optional queue port for running hooks under a shared deadline; defaults to an internal adapter.
	readonly queue?: QueuePort
}
export type LifecycleEventMap = {
	transition: [LifecycleState]
	create: []
	start: []
	stop: []
	destroy: []
	error: [Error]
}

// ---------------------------
// Container-related types centralization
// ---------------------------

export interface ContainerOptions { readonly parent?: Container }

export interface ResolvedProvider<T> { value: T, lifecycle?: Lifecycle, disposable: boolean }
export interface Registration<T> { token: Token<T>, provider: Provider<T>, resolved?: ResolvedProvider<T> }

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
	resolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }

	/** Get via the default or named container (optional). */
	get<T>(token: Token<T>, name?: string | symbol): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }

	/** Run work in a child scope of the default or named container. */
	using<T>(fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T>
	using<T>(apply: (scope: Container) => void, fn: (scope: Container) => Promise<T> | T, name?: string | symbol): Promise<T>
}

// ---------------------------
// Orchestrator types
// ---------------------------

/** Per-phase timeouts in milliseconds. */
export type PhaseTimeouts = Readonly<{ onStart?: number, onStop?: number, onDestroy?: number }>

export type Task<T> = () => Promise<T>

export type PhaseResultOk = Readonly<{ ok: true, durationMs: number }>
export type PhaseResultErr = Readonly<{ ok: false, durationMs: number, error: Error, timedOut: boolean }>
export type PhaseResult = PhaseResultOk | PhaseResultErr

export type Outcome = Readonly<{ token: string, ok: boolean, durationMs: number, timedOut?: boolean }>

export type DestroyJobResult = Readonly<{ stopOutcome?: Outcome, destroyOutcome?: Outcome, errors?: LifecycleErrorDetail[] }>

export type OrchestratorStartResult = Readonly<{ token: Token<unknown>, lc: Lifecycle, result: PhaseResult }>

export interface OrchestratorRegistration<T> {
	readonly token: Token<T>
	readonly provider: Provider<T>
	readonly dependencies?: readonly Token<unknown>[]
	readonly timeouts?: PhaseTimeouts
}

export interface OrchestratorOptions {
	readonly defaultTimeouts?: PhaseTimeouts
	readonly events?: {
		onComponentStart?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentStop?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentDestroy?: (info: { token: Token<unknown>, durationMs: number }) => void
		onComponentError?: (detail: LifecycleErrorDetail) => void
	}
	readonly tracer?: {
		onLayers?: (payload: { layers: string[][] }) => void
		onPhase?: (payload: { phase: LifecyclePhase, layer: number, outcomes: Outcome[] }) => void
	}
	readonly concurrency?: number
	readonly layer?: LayerPort
	readonly queue?: QueuePort
}

export type OrchestratorGetter = {
	(name?: string | symbol): Orchestrator
	set(name: string | symbol, o: Orchestrator, lock?: boolean): void
	clear(name: string | symbol, force?: boolean): boolean
	list(): (string | symbol)[]
}

export interface RegisterOptions {
	dependencies?: Token<unknown>[] | Record<string, Token<unknown>>
	timeouts?: PhaseTimeouts
}

// Internal node entry used by orchestrator
export interface NodeEntry { readonly token: Token<unknown>, readonly dependencies: readonly Token<unknown>[], readonly timeouts?: PhaseTimeouts }
