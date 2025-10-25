import type { Container } from './container.js'
import type { Adapter } from './adapter.js'
import type { Orchestrator } from './orchestrator.js'

// -----------------------------------------------------------------------------
// Tokens
// -----------------------------------------------------------------------------
export type Token<T> = symbol & { readonly __t?: T }
export type TokensOf<T extends Record<string, unknown>> = { [K in keyof T & string]: Token<T[K]> }
export type TokenRecord = Record<string, Token<unknown>>
export type ResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }
export type OptionalResolvedMap<TMap extends TokenRecord> = { [K in keyof TMap]: TMap[K] extends Token<infer U> ? U | undefined : never }

// -----------------------------------------------------------------------------
// Adapter Provider (only provider type)
// -----------------------------------------------------------------------------

/**
 * Provider for Adapter subclasses using the singleton pattern.
 * Registers an Adapter class directly; lifecycle managed via static methods.
 * Container registers the class but resolves to the singleton instance.
 * 
 * @typeParam T - The Adapter subclass type (instance type)
 */
export type AdapterProvider<T extends Adapter> = {
	readonly adapter: AdapterSubclass<T>
}

export type Provider<T> = T extends Adapter ? AdapterProvider<T> : never

// -----------------------------------------------------------------------------
// Adapter subclass type
// -----------------------------------------------------------------------------

/**
 * Type representing an Adapter subclass constructor with static lifecycle methods.
 * 
 * @typeParam I - The instance type of the Adapter subclass
 */
export interface AdapterSubclass<I extends Adapter> {
	new (): I
	instance: I | undefined
	getInstance(): I
	getState(): 'created' | 'started' | 'stopped' | 'destroyed'
	create(): Promise<I>
	start(): Promise<I>
	stop(): Promise<I>
	destroy(): Promise<I>
	on(event: string, fn: (state: string) => void): void
	off(event: string, fn: (state: string) => void): void
}

// -----------------------------------------------------------------------------
// Container types
// -----------------------------------------------------------------------------

export type Registration<T> = {
	readonly token: Token<T>
	readonly provider: Provider<T>
}

export type ResolvedProvider<T> = {
	readonly value: T
	readonly lifecycle?: AdapterSubclass<Adapter>
}

export type ContainerGetter = <T>(token: Token<T>) => T

export interface ContainerOptions {
	readonly parent?: Container
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
}

// -----------------------------------------------------------------------------
// Orchestrator types
// -----------------------------------------------------------------------------

export type Phase = 'created' | 'started' | 'stopped' | 'destroyed'

export interface OrchestratorOptions {
	readonly logger?: LoggerPort
	readonly diagnostic?: DiagnosticPort
	readonly timeouts?: Readonly<Record<Phase, number>>
}

export type LayerSpec<TMap extends TokenRecord> = {
	readonly tokens: TMap
	readonly timeouts?: Readonly<Record<Phase, number>>
}

export interface LayerInstance<TMap extends TokenRecord> {
	readonly label: string
	readonly values: ResolvedMap<TMap>
	readonly lifecycles: ReadonlyArray<AdapterSubclass<Adapter>>
}

// -----------------------------------------------------------------------------
// Port types (unchanged)
// -----------------------------------------------------------------------------

export interface LoggerPort {
	log(message: string): void
	warn(message: string): void
	error(message: string): void
	debug(message: string): void
}

export interface DiagnosticPort {
	report(error: unknown): void
	reportAll(errors: readonly unknown[]): void
}

export interface EmitterPort {
	on(event: string, fn: (...args: readonly unknown[]) => void): this
	off(event: string, fn: (...args: readonly unknown[]) => void): this
	once(event: string, fn: (...args: readonly unknown[]) => void): this
	emit(event: string, ...args: readonly unknown[]): boolean
}

export interface QueuePort {
	size: number
	add<T>(fn: () => Promise<T>): Promise<T>
	pause(): void
	resume(): void
	clear(): void
}

export interface RegistryPort<T> {
	readonly size: number
	get(key: symbol): T | undefined
	has(key: symbol): boolean
	set(key: symbol, value: T, lock?: boolean): this
	delete(key: symbol): boolean
	clear(): void
	keys(): IterableIterator<symbol>
	values(): IterableIterator<T>
	entries(): IterableIterator<[symbol, T]>
}

// -----------------------------------------------------------------------------
// Aggregate error for lifecycle failures
// -----------------------------------------------------------------------------

export interface AggregateLifecycleError extends Error {
	readonly errors: readonly Error[]
	readonly code: string
}

// -----------------------------------------------------------------------------
// Utility guards and schema inference
// -----------------------------------------------------------------------------

export type Guard<T> = (x: unknown) => x is T
export type PrimitiveTag = 'string' | 'number' | 'boolean' | 'symbol' | 'bigint' | 'function' | 'object'

export type SchemaSpec = Readonly<
	| { type: PrimitiveTag }
	| { literal: string | number | boolean }
	| { array: SchemaSpec }
	| { object: Record<string, SchemaSpec> }
	| { optional: SchemaSpec }
	| { union: readonly SchemaSpec[] }
>

export type InferSchema<S extends SchemaSpec> = S extends { type: 'string' }
	? string
	: S extends { type: 'number' }
		? number
		: S extends { type: 'boolean' }
			? boolean
			: S extends { type: 'symbol' }
				? symbol
				: S extends { type: 'bigint' }
					? bigint
					: S extends { type: 'function' }
						? (...args: readonly unknown[]) => unknown
						: S extends { type: 'object' }
							? Record<string, unknown>
							: S extends { literal: infer L }
								? L
								: S extends { array: infer A extends SchemaSpec }
									? ReadonlyArray<InferSchema<A>>
									: S extends { object: infer O extends Record<string, SchemaSpec> }
										? { readonly [K in keyof O]: InferSchema<O[K]> }
										: S extends { optional: infer U extends SchemaSpec }
											? InferSchema<U> | undefined
											: S extends { union: readonly (infer U extends SchemaSpec)[] }
												? InferSchema<U>
												: never
