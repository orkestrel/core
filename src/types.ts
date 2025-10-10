import type { Container } from './container.js'
import type { Lifecycle } from './lifecycle.js'
import type { Orchestrator } from './orchestrator.js'

export type EventMap = Record<string, unknown[]>
export type EmitterListener<EMap extends EventMap, E extends keyof EMap & string> = (...args: EMap[E]) => void

export interface EmitterPort<EMap extends EventMap = EventMap> {
	on<E extends keyof EMap & string>(event: E, fn: EmitterListener<EMap, E>): this
	off<E extends keyof EMap & string>(event: E, fn: EmitterListener<EMap, E>): this
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void
	removeAllListeners(): void
}

export interface EmitterAdapterOptions {
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}

export type EventHandler<T> = (payload: T) => void | Promise<void>

export interface EventPort<EMap extends Record<string, unknown> = Record<string, unknown>> {
	publish<E extends keyof EMap & string>(topic: E, payload: EMap[E]): Promise<void>
	subscribe<E extends keyof EMap & string>(topic: E, handler: EventHandler<EMap[E]>): Promise<() => void | Promise<void>>
	topics(): ReadonlyArray<string>
}

export interface EventAdapterOptions {
	readonly onError?: (err: unknown, topic: string) => void
	readonly sequential?: boolean
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}

export interface LayerNode<T = unknown> {
	readonly token: Token<T>
	readonly dependencies: readonly Token<unknown>[]
}

export interface LayerPort {
	compute<T>(nodes: ReadonlyArray<LayerNode<T>>): Token<T>[][]
	group<T>(tokens: ReadonlyArray<Token<T>>, layers: ReadonlyArray<ReadonlyArray<Token<T>>>): Token<T>[][]
}

export interface QueuePort<T = unknown> {
	enqueue(item: T): Promise<void>
	dequeue(): Promise<T | undefined>
	size(): Promise<number>
	run<R>(tasks: ReadonlyArray<() => Promise<R> | R>, options?: QueueRunOptions): Promise<ReadonlyArray<R>>
}

export interface QueueRunOptions {
	readonly concurrency?: number
	readonly timeout?: number
	readonly deadline?: number
	readonly signal?: AbortSignal
}

export interface QueueAdapterOptions extends QueueRunOptions {
	readonly capacity?: number
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}

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
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}

export interface LayerAdapterOptions {
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerPort {
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void
}

export type DiagnosticScope = 'lifecycle' | 'orchestrator' | 'container' | 'registry' | 'internal'

export interface DiagnosticErrorContext {
	readonly scope?: DiagnosticScope
	readonly code?: string
	readonly token?: string
	readonly phase?: LifecyclePhase
	readonly hook?: LifecycleHook
	readonly timedOut?: boolean
	readonly durationMs?: number
	readonly extra?: Record<string, unknown>
	readonly details?: ReadonlyArray<LifecycleErrorDetail>
}

export interface DiagnosticPort {
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void
	error(err: unknown, context?: DiagnosticErrorContext): void
	fail(key: string, context?: DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }): never
	aggregate(key: string, details: ReadonlyArray<LifecycleErrorDetail | Error>, context?: DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }): never
	help(key: string, context?: DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }): Error
	metric(name: string, value: number, tags?: Record<string, string | number | boolean>): void
	trace(name: string, payload?: Record<string, unknown>): void
	event(name: string, payload?: Record<string, unknown>): void
}

export type MessageMapEntry = Readonly<{ level?: LogLevel, message?: string }>

export interface DiagnosticMessage extends MessageMapEntry { readonly key: string }

export interface DiagnosticAdapterOptions {
	readonly logger?: LoggerPort
	readonly messages?: ReadonlyArray<DiagnosticMessage>
}

export type Token<T> = symbol & { readonly __t?: T }
export type TokensOf<T extends Record<string, unknown>> = { [K in keyof T & string]: Token<T[K]> }
export type TokenRecord = Record<string, Token<unknown>>
export type ResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }
export type OptionalResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }

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
export type ClassProviderWithObject<T, O extends Record<string, unknown>> = {
	readonly useClass: new (deps: O) => T
	readonly inject: InjectObject<O>
}
export type ClassProvider<T> = ClassProviderNoDeps<T> | ClassProviderWithTuple<T, readonly unknown[]> | ClassProviderWithObject<T, Record<string, unknown>>

export type Provider<T> = T | ValueProvider<T> | FactoryProvider<T> | ClassProvider<T>

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
		| 'ORK1022' // Lifecycle: hook failed
		| 'ORK1040' // Ports: duplicate key
		| 'ORK1050' // Queue: capacity exceeded
		| 'ORK1051' // Queue: aborted
		| 'ORK1052' // Queue: task timed out
		| 'ORK1053' // Queue: shared deadline exceeded
		| 'ORK1099' // Internal invariant

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

export type AggregateLifecycleError = Error & Readonly<{ details: ReadonlyArray<LifecycleErrorDetail>, errors: ReadonlyArray<Error>, code?: string, helpUrl?: string }>

export type LifecycleState = 'created' | 'started' | 'stopped' | 'destroyed'
export interface LifecycleOptions {
	readonly timeouts?: number
	readonly emitInitial?: boolean
	readonly emitter?: EmitterPort<LifecycleEventMap>
	readonly queue?: QueuePort
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}
export type LifecycleEventMap = {
	transition: [LifecycleState]
	create: []
	start: []
	stop: []
	destroy: []
	error: [Error]
}

export interface ContainerOptions { readonly parent?: Container, readonly diagnostic?: DiagnosticPort, readonly logger?: LoggerPort }

export interface ResolvedProvider<T> { value: T, lifecycle?: Lifecycle, disposable: boolean }
export interface Registration<T> { token: Token<T>, provider: Provider<T>, resolved?: ResolvedProvider<T> }

export type ContainerGetter = {
	(name?: string | symbol): Container
	set(name: string | symbol, c: Container, lock?: boolean): void
	clear(name: string | symbol, force?: boolean): boolean
	list(): (string | symbol)[]
	resolve<T>(token: Token<T>, name?: string | symbol): T
	resolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }
	resolve<O extends Record<string, unknown>>(tokens: InjectObject<O>, name?: string | symbol): O
	get<T>(token: Token<T>, name?: string | symbol): T | undefined
	get<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }
	using(fn: (c: Container) => void | Promise<void>, name?: string | symbol): Promise<void>
	using<T>(fn: (c: Container) => T | Promise<T>, name?: string | symbol): Promise<T>
	using<T>(apply: (c: Container) => void | Promise<void>, fn: (c: Container) => T | Promise<T>, name?: string | symbol): Promise<T>
}

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
	readonly timeouts?: number | PhaseTimeouts
}

export interface OrchestratorOptions {
	readonly timeouts?: number | PhaseTimeouts
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
	readonly layer?: LayerPort
	readonly queue?: QueuePort
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}

export type OrchestratorGetter = {
	(name?: string | symbol): Orchestrator
	set(name: string | symbol, o: Orchestrator, lock?: boolean): void
	clear(name: string | symbol, force?: boolean): boolean
	list(): (string | symbol)[]
}

export interface RegisterOptions {
	dependencies?: Token<unknown>[] | Record<string, Token<unknown>>
	timeouts?: number | PhaseTimeouts
}

export interface NodeEntry { readonly token: Token<unknown>, readonly dependencies: readonly Token<unknown>[], readonly timeouts?: number | PhaseTimeouts }
