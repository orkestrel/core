import type { ContainerAdapter } from './adapters/container.js'
import type { Adapter } from './adapter.js'
import type { OrchestratorAdapter } from './adapters/orchestrator.js'

// -----------------------------------------------------------------------------
// Core utility types
// -----------------------------------------------------------------------------

/** Cleanup function returned by event subscriptions */
export type Unsubscribe = () => void

/**
 * Converts subscription methods to hook callbacks for options.
 * Takes methods like `onEvent(callback: (data: T) => void): Unsubscribe`
 * and converts them to `onEvent?: (data: T) => void`
 */
export type SubscriptionToHook<T> = {
	[K in keyof T]?: T[K] extends (callback: infer CB) => Unsubscribe ? CB : never
}

// -----------------------------------------------------------------------------
// Tokens and provider model
// -----------------------------------------------------------------------------
export type Token<T> = symbol & { readonly __t?: T };
export type TokensOf<T extends Record<string, unknown>> = { [K in keyof T & string]: Token<T[K]> };
export type TokenRecord = Record<string, Token<unknown>>;
export type ResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never };
export type OptionalResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never };

export interface ValueProvider<T> { readonly useValue: T }

export type InjectTuple<A extends readonly unknown[]> = { readonly [K in keyof A]: Token<A[K]> };
export type InjectObject<O extends Record<string, unknown>> = Readonly<{ [K in keyof O]: Token<O[K]> }>;

export interface FactoryProviderNoDeps<T> { readonly useFactory: () => T }
export interface FactoryProviderWithContainer<T> { readonly useFactory: (container: ContainerAdapter) => T }
export interface FactoryProviderWithTuple<T, A extends readonly unknown[]> {
	readonly useFactory: (...args: A) => T;
	readonly inject: InjectTuple<A>;
}
export interface FactoryProviderWithObject<T, O extends Record<string, unknown>> {
	readonly useFactory: (deps: O) => T;
	readonly inject: InjectObject<O>;
}
export type FactoryProvider<T>
	= | FactoryProviderNoDeps<T>
		| FactoryProviderWithContainer<T>
		| FactoryProviderWithTuple<T, readonly unknown[]>
		| FactoryProviderWithObject<T, Record<string, unknown>>;

export type CtorNoDeps<T> = new () => T;
export type CtorWithContainer<T> = new (container: ContainerAdapter) => T;

export interface ClassProviderNoDeps<T> { readonly useClass: CtorNoDeps<T> }
export interface ClassProviderWithContainer<T> { readonly useClass: CtorWithContainer<T> }
export interface ClassProviderWithTuple<T, A extends readonly unknown[]> {
	readonly useClass: new (...args: A) => T;
	readonly inject: InjectTuple<A>;
}
export interface ClassProviderWithObject<T, O extends Record<string, unknown>> {
	readonly useClass: new (deps: O) => T;
	readonly inject: InjectObject<O>;
}
export type ClassProvider<T> = ClassProviderNoDeps<T> | ClassProviderWithContainer<T> | ClassProviderWithTuple<T, readonly unknown[]> | ClassProviderWithObject<T, Record<string, unknown>>;

/**
 * Provider for Adapter subclasses using the singleton pattern.
 * Registers an Adapter class directly; lifecycle managed via static methods.
 *
 * @typeParam T - The Adapter instance type
 */
export interface AdapterProvider<T extends Adapter> {
	readonly adapter: AdapterSubclass<T>;
}

export type Provider<T> = T | ValueProvider<T> | FactoryProvider<T> | ClassProvider<T> | (T extends Adapter ? AdapterProvider<T> : never);

// -----------------------------------------------------------------------------
// Provider matching
// -----------------------------------------------------------------------------
export interface ProviderMatchHandlers<T> {
	raw: (value: T) => Provider<T>;
	value: (p: ValueProvider<T>) => Provider<T>;
	adapter: (p: T extends Adapter ? AdapterProvider<T> : never) => (T extends Adapter ? AdapterProvider<T> : never);
	factoryTuple: <A extends readonly unknown[]>(p: FactoryProviderWithTuple<T, A>) => FactoryProviderWithTuple<T, A>;
	factoryObject: <O extends Record<string, unknown>>(p: FactoryProviderWithObject<T, O>) => FactoryProviderWithObject<T, O>;
	factoryContainer: (p: FactoryProviderWithContainer<T>) => FactoryProviderWithContainer<T>;
	factoryNoDeps: (p: FactoryProviderNoDeps<T>) => FactoryProviderNoDeps<T>;
	classTuple: <A extends readonly unknown[]>(p: ClassProviderWithTuple<T, A>) => ClassProviderWithTuple<T, A>;
	classObject: <O extends Record<string, unknown>>(p: ClassProviderWithObject<T, O>) => ClassProviderWithObject<T, O>;
	classContainer: (p: ClassProviderWithContainer<T>) => ClassProviderWithContainer<T>;
	classNoDeps: (p: ClassProviderNoDeps<T>) => ClassProviderNoDeps<T>;
}

export interface ProviderMatchReturnHandlers<T, R> {
	raw: (value: T) => R;
	value: (p: ValueProvider<T>) => R;
	adapter: (p: T extends Adapter ? AdapterProvider<T> : never) => R;
	factoryTuple: <A extends readonly unknown[]>(p: FactoryProviderWithTuple<T, A>) => R;
	factoryObject: <O extends Record<string, unknown>>(p: FactoryProviderWithObject<T, O>) => R;
	factoryContainer: (p: FactoryProviderWithContainer<T>) => R;
	factoryNoDeps: (p: FactoryProviderNoDeps<T>) => R;
	classTuple: <A extends readonly unknown[]>(p: ClassProviderWithTuple<T, A>) => R;
	classObject: <O extends Record<string, unknown>>(p: ClassProviderWithObject<T, O>) => R;
	classContainer: (p: ClassProviderWithContainer<T>) => R;
	classNoDeps: (p: ClassProviderNoDeps<T>) => R;
}

// -----------------------------------------------------------------------------
// Utility guards and schema inference
// -----------------------------------------------------------------------------
export type Guard<T> = (x: unknown) => x is T;
export type PrimitiveTag = 'string' | 'number' | 'boolean' | 'symbol' | 'bigint' | 'function' | 'object';
export type SchemaSpec = Readonly<{ [k: string]: SchemaSpec | PrimitiveTag | Guard<unknown> }>;
export type ResolveRule<R>
	= R extends 'string' ? string
		: R extends 'number' ? number
			: R extends 'boolean' ? boolean
				: R extends 'symbol' ? symbol
					: R extends 'bigint' ? bigint
						: R extends 'function' ? (...args: unknown[]) => unknown
							: R extends 'object' ? Record<string, unknown>
								: R extends Guard<infer U> ? U
									: R extends SchemaSpec ? FromSchema<R>
										: never;
export type FromSchema<S extends SchemaSpec> = { [K in keyof S]: ResolveRule<S[K]> };

// -----------------------------------------------------------------------------
// Logging and diagnostics
// -----------------------------------------------------------------------------
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Behavioral interface for structured logging */
export interface LoggerInterface {
	debug(message: string, ...args: readonly unknown[]): void;
	info(message: string, ...args: readonly unknown[]): void;
	warn(message: string, ...args: readonly unknown[]): void;
	error(message: string, ...args: readonly unknown[]): void;
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void;
}

/** @deprecated Use LoggerInterface instead */
export type LoggerPort = LoggerInterface;

export type DiagnosticScope = 'lifecycle' | 'orchestrator' | 'container' | 'registry' | 'internal';

export type LifecyclePhase = 'start' | 'stop' | 'destroy';
export type LifecycleHook = 'create' | 'start' | 'stop' | 'destroy';
export type LifecycleContext = 'normal' | 'rollback' | 'container';

export interface LifecycleErrorDetail {
	tokenDescription: string;
	phase: LifecyclePhase;
	context: LifecycleContext;
	timedOut: boolean;
	durationMs: number;
	error: Error;
}

export interface DiagnosticErrorContext {
	readonly scope?: DiagnosticScope;
	readonly code?: string;
	readonly token?: string;
	readonly phase?: LifecyclePhase;
	readonly hook?: LifecycleHook;
	readonly timedOut?: boolean;
	readonly durationMs?: number;
	readonly extra?: Record<string, unknown>;
	readonly details?: readonly LifecycleErrorDetail[];
}

export interface DiagnosticFailContext extends DiagnosticErrorContext {
	readonly message?: string;
	readonly helpUrl?: string;
	readonly name?: string;
}

/** Behavioral interface for diagnostics, error handling, metrics, and telemetry */
export interface DiagnosticInterface {
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void;
	error(err: unknown, context?: DiagnosticErrorContext): void;
	fail(key: string, context?: DiagnosticFailContext): never;
	aggregate(key: string, details: readonly (LifecycleErrorDetail | Error)[], context?: DiagnosticFailContext): never;
	help(key: string, context?: DiagnosticFailContext): Error;
	metric(name: string, value: number, tags?: Record<string, string | number | boolean>): void;
	trace(name: string, payload?: Record<string, unknown>): void;
	event(name: string, payload?: Record<string, unknown>): void;
}

/** @deprecated Use DiagnosticInterface instead */
export type DiagnosticPort = DiagnosticInterface;

export type MessageMapEntry = Readonly<{ level?: LogLevel; message?: string }>;
export interface DiagnosticMessage extends MessageMapEntry { readonly key: string }
export interface DiagnosticAdapterOptions { readonly logger?: LoggerPort; readonly messages?: readonly DiagnosticMessage[] }

export type AggregateLifecycleError = Error & Readonly<{ details: readonly LifecycleErrorDetail[]; errors: readonly Error[]; code?: string; helpUrl?: string }>;

// -----------------------------------------------------------------------------
// Emitter and event bus
// -----------------------------------------------------------------------------
export type EventMap = Record<string, readonly unknown[]>;

/** Event listener callback that returns unknown for flexibility */
export type EventListener<EMap extends EventMap, E extends keyof EMap & string> = (...args: EMap[E]) => unknown;

/** @deprecated Use EventListener instead */
export type EmitterListener<EMap extends EventMap, E extends keyof EMap & string> = EventListener<EMap, E>;

/** Behavioral interface for typed synchronous event emission */
export interface EmitterInterface<EMap extends EventMap = EventMap> {
	on<E extends keyof EMap & string>(event: E, fn: EventListener<EMap, E>): Unsubscribe;
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void;
	removeAllListeners(): void;
}

/** @deprecated Use EmitterInterface instead */
export interface EmitterPort<EMap extends EventMap = EventMap> {
	on<E extends keyof EMap & string>(event: E, fn: EventListener<EMap, E>): this;
	off<E extends keyof EMap & string>(event: E, fn: EventListener<EMap, E>): this;
	emit<E extends keyof EMap & string>(event: E, ...args: EMap[E]): void;
	removeAllListeners(): void;
}

export interface EmitterAdapterOptions { readonly logger?: LoggerInterface; readonly diagnostic?: DiagnosticInterface }

export type EventHandler<T> = (payload: T) => void | Promise<void>;

/** Behavioral interface for async topic-based pub/sub */
export interface EventBusInterface<EMap extends Record<string, unknown> = Record<string, unknown>> {
	publish<E extends keyof EMap & string>(topic: E, payload: EMap[E]): Promise<void>;
	subscribe<E extends keyof EMap & string>(topic: E, handler: EventHandler<EMap[E]>): Promise<Unsubscribe>;
	topics(): readonly string[];
}

/** @deprecated Use EventBusInterface instead */
export interface EventPort<EMap extends Record<string, unknown> = Record<string, unknown>> {
	publish<E extends keyof EMap & string>(topic: E, payload: EMap[E]): Promise<void>;
	subscribe<E extends keyof EMap & string>(topic: E, handler: EventHandler<EMap[E]>): Promise<() => void | Promise<void>>;
	topics(): readonly string[];
}

export interface EventAdapterOptions {
	readonly onError?: (err: unknown, topic: string) => void;
	readonly sequential?: boolean;
	readonly logger?: LoggerInterface;
	readonly diagnostic?: DiagnosticInterface;
}

// -----------------------------------------------------------------------------
// Queue
// -----------------------------------------------------------------------------
export interface QueueRunOptions {
	readonly concurrency?: number;
	readonly timeout?: number;
	readonly deadline?: number;
	readonly signal?: AbortSignal;
}

/** Behavioral interface for task queue with concurrency control */
export interface QueueInterface<T = unknown> {
	enqueue(item: T): Promise<void>;
	dequeue(): Promise<T | undefined>;
	size(): Promise<number>;
	run<R>(tasks: readonly (() => Promise<R> | R)[], options?: QueueRunOptions): Promise<readonly R[]>;
}

/** @deprecated Use QueueInterface instead */
export type QueuePort<T = unknown> = QueueInterface<T>;

export interface QueueAdapterOptions extends QueueRunOptions { readonly capacity?: number; readonly logger?: LoggerInterface; readonly diagnostic?: DiagnosticInterface }

// -----------------------------------------------------------------------------
// Layering
// -----------------------------------------------------------------------------
export interface LayerNode<T = unknown> {
	readonly token: Token<T>;
	readonly dependencies: readonly Token<unknown>[];
}

/** Behavioral interface for topological layer computation */
export interface LayerInterface {
	compute<T>(nodes: readonly LayerNode<T>[]): readonly (readonly Token<T>[])[];
	group<T>(tokens: readonly Token<T>[], layers: readonly (readonly Token<T>[])[]): readonly (readonly Token<T>[])[];
}

/** @deprecated Use LayerInterface instead */
export interface LayerPort {
	compute<T>(nodes: readonly LayerNode<T>[]): Token<T>[][];
	group<T>(tokens: readonly Token<T>[], layers: readonly (readonly Token<T>[])[]): Token<T>[][];
}

export interface LayerAdapterOptions { readonly logger?: LoggerInterface; readonly diagnostic?: DiagnosticInterface }

// -----------------------------------------------------------------------------
// Lifecycle and Adapter
// -----------------------------------------------------------------------------
export type LifecycleState = 'created' | 'started' | 'stopped' | 'destroyed';

/** Subscription interface for lifecycle events - all methods return Unsubscribe */
export interface LifecycleSubscriptions {
	onTransition(callback: (state: LifecycleState) => unknown): Unsubscribe;
	onCreate(callback: () => unknown): Unsubscribe;
	onStart(callback: () => unknown): Unsubscribe;
	onStop(callback: () => unknown): Unsubscribe;
	onDestroy(callback: () => unknown): Unsubscribe;
	onError(callback: (error: Error) => unknown): Unsubscribe;
}

/**
 * Type helper for Adapter subclass constructors.
 * @typeParam I - The Adapter subclass instance type
 */
export interface AdapterSubclass<I extends Adapter> {
	new (opts?: LifecycleOptions): I;
	instance?: I | undefined;
	getInstance(opts?: LifecycleOptions): I;
	getState(): LifecycleState;
	create(opts?: LifecycleOptions): Promise<void>;
	start(opts?: LifecycleOptions): Promise<void>;
	stop(): Promise<void>;
	destroy(): Promise<void>;
	on<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => unknown): unknown;
	off<T extends keyof LifecycleEventMap & string>(evt: T, fn: (...args: LifecycleEventMap[T]) => unknown): unknown;
}

export interface LifecycleEventMap {
	[key: string]: readonly unknown[];
	transition: readonly [LifecycleState];
	create: readonly [];
	start: readonly [];
	stop: readonly [];
	destroy: readonly [];
	error: readonly [Error];
}

/** Options for adapter lifecycle configuration */
export interface AdapterOptions {
	readonly timeouts?: number;
	readonly emitInitial?: boolean;
	readonly emitter?: EmitterPort<LifecycleEventMap>;
	readonly queue?: QueueInterface;
	readonly logger?: LoggerInterface;
	readonly diagnostic?: DiagnosticInterface;
}

/** @deprecated Use AdapterOptions instead */
export type LifecycleOptions = AdapterOptions;

// -----------------------------------------------------------------------------
// Container
// -----------------------------------------------------------------------------
export interface ContainerOptions { readonly parent?: ContainerAdapter; readonly diagnostic?: DiagnosticInterface; readonly logger?: LoggerInterface }

export interface ResolvedProvider<T> {
	value: T;
	lifecycle?: AdapterSubclass<Adapter>;
	disposable: boolean;
}
export interface Registration<T> { token: Token<T>; provider: Provider<T>; resolved?: ResolvedProvider<T> }

export interface ContainerGetter {
	(name?: string | symbol): ContainerAdapter;
	set(name: string | symbol, c: ContainerAdapter, lock?: boolean): void;
	clear(name: string | symbol, force?: boolean): boolean;
	list(): (string | symbol)[];
	resolve<T>(token: Token<T>, name?: string | symbol): T;
	resolve<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never };
	resolve<O extends Record<string, unknown>>(tokens: InjectObject<O>, name?: string | symbol): O;
	resolve<A extends readonly unknown[]>(tokens: InjectTuple<A>, name?: string | symbol): A;
	get<T>(token: Token<T>, name?: string | symbol): T | undefined;
	get<TMap extends TokenRecord>(tokens: TMap, name?: string | symbol): { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never };
	get<O extends Record<string, unknown>>(tokens: InjectObject<O>, name?: string | symbol): { [K in keyof O]: O[K] | undefined };
	get<A extends readonly unknown[]>(tokens: InjectTuple<A>, name?: string | symbol): { [K in keyof A]: A[K] | undefined };
	using(fn: (c: ContainerAdapter) => void | Promise<void>, name?: string | symbol): Promise<void>;
	using<T>(fn: (c: ContainerAdapter) => T | Promise<T>, name?: string | symbol): Promise<T>;
	using<T>(apply: (c: ContainerAdapter) => void | Promise<void>, fn: (c: ContainerAdapter) => T | Promise<T>, name?: string | symbol): Promise<T>;
}

// -----------------------------------------------------------------------------
// Orchestrator
// -----------------------------------------------------------------------------
export type PhaseTimeouts = Readonly<{ onStart?: number; onStop?: number; onDestroy?: number }>;

export type Task<T> = () => Promise<T>;

export type PhaseResultOk = Readonly<{ ok: true; durationMs: number }>;
export type PhaseResultErr = Readonly<{ ok: false; durationMs: number; error: Error; timedOut: boolean }>;
export type PhaseResult = PhaseResultOk | PhaseResultErr;

export type Outcome = Readonly<{ token: string; ok: boolean; durationMs: number; timedOut?: boolean }>;

export type DestroyJobResult = Readonly<{ stopOutcome?: Outcome; destroyOutcome?: Outcome; errors?: LifecycleErrorDetail[] }>;

export type OrchestratorStartResult = Readonly<{ token: Token<Adapter>; lc: Adapter; result: PhaseResult }>;

export interface OrchestratorRegistration<T> {
	readonly token: Token<T>;
	readonly provider: Provider<T>;
	readonly dependencies?: readonly Token<unknown>[];
	readonly timeouts?: number | PhaseTimeouts;
}

export interface OrchestratorOptions {
	readonly timeouts?: number | PhaseTimeouts;
	readonly events?: {
		onComponentStart?: (info: { token: Token<unknown>; durationMs: number }) => void;
		onComponentStop?: (info: { token: Token<unknown>; durationMs: number }) => void;
		onComponentDestroy?: (info: { token: Token<unknown>; durationMs: number }) => void;
		onComponentError?: (detail: LifecycleErrorDetail) => void;
	};
	readonly tracer?: {
		onLayers?: (payload: { layers: string[][] }) => void;
		onPhase?: (payload: { phase: LifecyclePhase; layer: number; outcomes: Outcome[] }) => void;
	};
	readonly layer?: LayerPort;
	readonly queue?: QueueInterface;
	readonly logger?: LoggerInterface;
	readonly diagnostic?: DiagnosticInterface;
}

export interface OrchestratorGetter {
	(name?: string | symbol): OrchestratorAdapter;
	set(name: string | symbol, o: OrchestratorAdapter, lock?: boolean): void;
	clear(name: string | symbol, force?: boolean): boolean;
	list(): (string | symbol)[];
}

export interface RegisterOptions {
	dependencies?: Token<Adapter>[] | Record<string, Token<Adapter>>;
	timeouts?: number | PhaseTimeouts;
}

export type OrchestratorGraphEntry<T extends Adapter = Adapter>
	= AdapterProvider<T> & { readonly dependencies?: readonly Token<Adapter>[]; readonly timeouts?: number | PhaseTimeouts };

export type OrchestratorGraph = Readonly<Record<symbol, OrchestratorGraphEntry>>;

export interface NodeEntry { readonly token: Token<Adapter>; readonly dependencies: readonly Token<Adapter>[]; readonly timeouts?: number | PhaseTimeouts }

// -----------------------------------------------------------------------------
// Registry (named singletons)
// -----------------------------------------------------------------------------

/** Behavioral interface for named singleton storage with locking */
export interface RegistryInterface<T> {
	get(name?: string | symbol): T | undefined;
	resolve(name?: string | symbol): T;
	set(name: string | symbol, value: T, lock?: boolean): void;
	clear(name?: string | symbol, force?: boolean): boolean;
	list(): readonly (string | symbol)[];
}

/** @deprecated Use RegistryInterface instead */
export type RegistryPort<T> = RegistryInterface<T>;

export interface RegistryAdapterOptions<T> {
	readonly label?: string;
	readonly default?: { readonly key?: symbol; readonly value: T };
	readonly logger?: LoggerInterface;
	readonly diagnostic?: DiagnosticInterface;
}
