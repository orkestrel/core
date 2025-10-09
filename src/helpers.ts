import type {
	Token,
	Provider,
	ValueProvider,
	FactoryProvider,
	FactoryProviderNoDeps,
	FactoryProviderWithTuple,
	FactoryProviderWithObject,
	ClassProvider,
	ClassProviderWithTuple,
	AggregateLifecycleError,
} from './types.js'
import type { Container } from './container.js'

// ---------------------------
// Narrowing primitives and contracts
// ---------------------------

/**
 * Type guard function contract.
 *
 * @typeParam T - The narrowed type when the guard returns true.
 * @example
 * const isDate: Guard<Date> = (x): x is Date => x instanceof Date
 */
export type Guard<T> = (x: unknown) => x is T

/**
 * Check whether a value is a non-null object (arrays included).
 *
 * @param x
 * @example
 * isObject({}) // true
 * isObject(null) // false
 * @returns -
 */
export function isObject(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null
}

/**
 * True when the value is a string primitive.
 * @param x
 * @returns -
 * @example
 */
export function isString(x: unknown): x is string {
	return typeof x === 'string'
}

/**
 * True when the value is a boolean primitive.
 * @param x
 * @returns -
 * @example
 */
export function isBoolean(x: unknown): x is boolean {
	return typeof x === 'boolean'
}

/**
 * True when the value is a finite number (excludes NaN/Infinity).
 * @param x
 * @returns -
 * @example
 */
export function isFiniteNumber(x: unknown): x is number {
	return typeof x === 'number' && Number.isFinite(x)
}

/**
 * Build a guard for arrays whose elements satisfy a provided element guard.
 *
 * @param elem
 * @typeParam T - Element type produced by the element guard.
 * @example
 * const isStringArray = arrayOf(isString)
 * isStringArray(['a','b']) // true
 * isStringArray(['a', 1]) // false
 * @returns -
 */
export function arrayOf<T>(elem: Guard<T>): Guard<ReadonlyArray<T>> {
	return (x: unknown): x is ReadonlyArray<T> => Array.isArray(x) && x.every(elem)
}

/**
 * Build a guard for a literal union by value equality.
 *
 * @param literals
 * @example
 * const isEnv = literalOf('dev', 'prod' as const)
 * isEnv('dev') // true
 * isEnv('test') // false
 * @returns -
 */
export function literalOf<const Literals extends readonly (string | number | boolean)[]>(...literals: Literals): Guard<Literals[number]> {
	return (x: unknown): x is Literals[number] => {
		for (const l of literals) {
			if (x === l) return true
		}
		return false
	}
}

// ---------------------------
// hasOwn: precise own-keys guard with overloads to preserve original type
// ---------------------------

/**
 * Narrow an unknown to an object that owns the given key(s) (does not traverse prototype).
 * Overloads preserve original object type when known.
 *
 * @param obj
 * @param key
 * @example
 * function f(x: unknown) {
 *   if (hasOwn(x, 'id', 'name')) {
 *     // x is now Record<'id' | 'name', unknown>
 *     console.log(x.id, x.name)
 *   }
 * }
 * @returns -
 */
export function hasOwn<K extends PropertyKey>(obj: unknown, key: K): obj is Record<K, unknown>
export function hasOwn<Ks extends readonly PropertyKey[]>(obj: unknown, ...keys: Ks): obj is { [P in Ks[number]]: unknown }
export function hasOwn<T extends object, K extends PropertyKey>(obj: T, key: K): obj is T & Record<K, unknown>
export function hasOwn<T extends object, Ks extends readonly PropertyKey[]>(obj: T, ...keys: Ks): obj is T & { [P in Ks[number]]: unknown }
export function hasOwn(obj: unknown, ...keys: readonly PropertyKey[]): boolean {
	if (!isObject(obj)) return false
	for (const k of keys) if (!Object.prototype.hasOwnProperty.call(obj, k)) return false
	return true
}

// ---------------------------
// Schema-based object guard with type inference
// ---------------------------

/** Primitive typeof tags supported by {@link hasSchema}. */
export type PrimitiveTag = 'string' | 'number' | 'boolean' | 'symbol' | 'bigint' | 'function' | 'object'

/**
 * Schema specification for {@link hasSchema} with nested objects and custom guards.
 *
 * Keys map to a PrimitiveTag, a nested SchemaSpec, or a user Guard.
 */
export type SchemaSpec = Readonly<{ [k: string]: SchemaSpec | PrimitiveTag | Guard<unknown> }>

/**
 * Resolve a single schema rule to a TypeScript type.
 * Used by {@link FromSchema}.
 */
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
										: never

/** Map a SchemaSpec to its inferred TypeScript object type. */
export type FromSchema<S extends SchemaSpec> = { [K in keyof S]: ResolveRule<S[K]> }

/**
 * Check that a value matches an object schema at runtime, with static type inference.
 *
 * @param obj
 * @param schema
 * @example
 * const schema = { id: 'string', config: { retries: 'number' } } as const
 * if (hasSchema(x, schema)) {
 *   // x is now { id: string, config: { retries: number } }
 * }
 * @returns -
 */
export function hasSchema<S extends SchemaSpec>(obj: unknown, schema: S): obj is FromSchema<S> {
	if (!isObject(obj)) return false
	for (const [k, rule] of Object.entries(schema)) {
		if (!Object.prototype.hasOwnProperty.call(obj, k)) return false
		const val = obj[k]
		if (typeof rule === 'string') {
			if (rule === 'object') {
				if (!isObject(val)) return false
			}
			else if (typeof val !== rule) {
				return false
			}
		}
		else if (typeof rule === 'function') {
			if (!rule(val)) return false
		}
		else {
			if (!hasSchema(val, rule)) return false
		}
	}
	return true
}

// ---------------------------
// Tokens helpers
// ---------------------------

/**
 * Create a unique Token (a branded Symbol) with a human-friendly description.
 *
 * @typeParam _T - The value type carried by the token (for typing only).
 * @param description - Symbol description used in diagnostics and debugging.
 * @returns A new unique symbol value suitable as a token.
 *
 * @example
 * const UserRepo = createToken<{ getById(id: string): Promise<User> }>('repo:User')
 */
export function createToken<_T = unknown>(description: string): Token<_T>
export function createToken(description: string): symbol {
	return Symbol(description)
}

/**
 * Create a set of tokens from a shape under a given namespace.
 *
 * @typeParam T - Shape whose property types become the token types.
 * @param namespace - Description prefix for token symbols.
 * @param shape - Object whose keys become token names.
 *
 * @example
 * const ports = createTokens('ports', { http: undefined as { get(url: string): Promise<string> } })
 * // ports.http is a Token<{ get(url: string): Promise<string> }>
 * @returns -
 */
export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): Readonly<{ [K in keyof T & string]: Token<T[K]> }>
export function createTokens(namespace: string, shape: Record<string, unknown>) {
	const out: Record<string, symbol> = {}
	for (const key of Object.keys(shape)) out[key] = createToken(`${namespace}:${key}`)
	return Object.freeze(out)
}

/**
 * Runtime check that a value is a Token (Symbol).
 *
 * @param x
 * @example
 * isToken(Symbol('x')) // true
 * isToken('x') // false
 * @returns -
 */
export function isToken(x: unknown): x is Token<unknown> {
	return typeof x === 'symbol'
}

/**
 * Guard for arrays of tokens.
 *
 * @param x
 * @example
 * isTokenArray([Symbol('a'), Symbol('b')]) // true
 * @returns -
 */
export function isTokenArray(x: unknown): x is ReadonlyArray<Token<unknown>> {
	return Array.isArray(x) && x.every(isToken)
}

/**
 * Guard that checks an object is a map whose values are tokens.
 *
 * @param x
 * @example
 * isTokenRecord({ a: Symbol('a') }) // true
 * isTokenRecord(['a' as any]) // false
 * @returns -
 */
export function isTokenRecord(x: unknown): x is Record<string, Token<unknown>> {
	if (!isObject(x) || Array.isArray(x)) return false
	for (const key of Object.keys(x)) {
		const v = x[key]
		if (!isToken(v)) return false
	}
	return true
}

// ---------------------------
// Provider and factory/class helpers (type guards)
// ---------------------------

/**
 * True when the provider is a ValueProvider shape.
 * @param p
 * @returns -
 * @example
 */
export function isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> {
	return isObject(p) && hasOwn(p, 'useValue')
}

/**
 * True when the provider is a FactoryProvider shape.
 * @param p
 * @returns -
 * @example
 */
export function isFactoryProvider<T>(p: Provider<T>): p is FactoryProvider<T> {
	return isObject(p) && hasOwn(p, 'useFactory')
}

/**
 * True when the provider is a ClassProvider shape.
 * @param p
 * @returns -
 * @example
 */
export function isClassProvider<T>(p: Provider<T>): p is ClassProvider<T> {
	return isObject(p) && hasOwn(p, 'useClass')
}

/**
 * Class provider with tuple inject.
 * @param p
 * @returns -
 * @example
 */
export function isClassProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | ClassProvider<T>): p is ClassProviderWithTuple<T, A> {
	return isObject(p) && hasOwn(p, 'useClass', 'inject') && Array.isArray(p.inject)
}

/**
 * Class provider with object inject.
 * @param p
 * @returns -
 * @example
 */
export function isClassProviderWithObject<T>(p: Provider<T> | ClassProvider<T>): p is ClassProvider<T> & { useClass: new (deps: Record<string, unknown>) => T, inject: Record<string, Token<unknown>> } {
	return isClassProvider(p) && hasOwn(p, 'inject') && isObject(p.inject) && !Array.isArray(p.inject)
}

/**
 * Class provider receiving the Container as its only constructor argument.
 * @param p
 * @returns -
 * @example
 */
export function isClassProviderWithContainer<T>(p: ClassProvider<T>): p is ClassProvider<T> & { useClass: (new (c: Container) => T) } {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length >= 1
}

/**
 * Class provider with no dependencies (zero-arg constructor).
 * @param p
 * @returns -
 * @example
 */
export function isClassProviderNoDeps<T>(p: ClassProvider<T>): p is { useClass: new () => T } {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length === 0
}

/**
 * Factory provider with tuple inject.
 * @param p
 * @returns -
 * @example
 */
export function isFactoryProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithTuple<T, A> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && Array.isArray(p.inject)
}

/**
 * Factory provider with object inject.
 * @param p
 * @returns -
 * @example
 */
export function isFactoryProviderWithObject<T>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithObject<T, Record<string, unknown>> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && isObject(p.inject) && !Array.isArray(p.inject)
}

/**
 * Factory provider that receives the Container as its only argument.
 * @param p
 * @returns -
 * @example
 */
export function isFactoryProviderWithContainer<T>(p: FactoryProvider<T>): p is { useFactory: (c: Container) => T } {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length >= 1
}

/**
 * Factory provider with no dependencies (zero-arg function).
 * @param p
 * @returns -
 * @example
 */
export function isFactoryProviderNoDeps<T>(p: FactoryProvider<T>): p is { useFactory: () => T } {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length === 0
}

/**
 * Check whether a function type accepts zero arguments (used for provider helpers).
 * @param fn
 * @returns -
 * @example
 */
export function isZeroArg<T>(fn: FactoryProviderNoDeps<T>['useFactory']): fn is () => T {
	return fn.length === 0
}

// ---------------------------
// General runtime helpers
// ---------------------------

/**
 * Return the internal [[Class]] tag string for a value (e.g., "[object Date]").
 * @param x
 * @returns -
 * @example
 */
export function getTag(x: unknown): string {
	return Object.prototype.toString.call(x)
}

/**
 * Heuristic check for an async function (native or transpiled) by tag or constructor name.
 *
 * @param fn
 * @example
 * isAsyncFunction(async () => {}) // true
 * @returns -
 */
export function isAsyncFunction(fn: unknown): fn is (...args: unknown[]) => Promise<unknown> {
	if (typeof fn !== 'function') return false
	if (getTag(fn) === '[object AsyncFunction]') return true
	const proto = Object.getPrototypeOf(fn)
	const ctorName = typeof proto?.constructor?.name === 'string' ? proto.constructor.name : undefined
	return ctorName === 'AsyncFunction'
}

/**
 * Narrow a value to Promise-like (duck-typed then-able) without requiring a real Promise instance.
 *
 * @param x
 * @example
 * isPromiseLike(Promise.resolve(1)) // true
 * @returns -
 */
export function isPromiseLike<T = unknown>(x: unknown): x is PromiseLike<T> {
	if (x == null) return false
	const t = typeof x
	if (t !== 'object' && t !== 'function') return false
	if (getTag(x) === '[object Promise]') return true
	if (!hasOwn(x, 'then')) return false
	return typeof x.then === 'function'
}

/**
 * Safely invoke an optional function with arguments; swallows any errors.
 *
 * Useful for emitting optional callbacks, diagnostics, and listeners.
 *
 * @param fn
 * @param args
 * @example
 * safeInvoke(() => mightThrow()) // never throws outward
 * @returns -
 */
export function safeInvoke<TArgs extends unknown[]>(fn: ((...args: TArgs) => unknown | Promise<unknown>) | undefined, ...args: TArgs): void {
	try {
		fn?.(...args)
	}
	catch {
		/* swallow */
	}
}

/**
 * Helper to format token symbols consistently for logs and diagnostics.
 * @param token
 * @returns -
 * @example
 */
export function tokenDescription(token: symbol): string {
	return token.description ?? String(token)
}

// ---------------------------
// Domain-specific guards
// ---------------------------

/**
 * Runtime guard for LifecycleErrorDetail using a schema definition.
 * @param x
 * @returns -
 * @example
 */
export function isLifecycleErrorDetail(x: unknown): x is {
	tokenDescription: string
	phase: 'start' | 'stop' | 'destroy'
	context: 'normal' | 'rollback' | 'container'
	timedOut: boolean
	durationMs: number
	error: Error
} {
	const schema = {
		tokenDescription: isString,
		phase: literalOf('start', 'stop', 'destroy'),
		context: literalOf('normal', 'rollback', 'container'),
		timedOut: isBoolean,
		durationMs: isFiniteNumber,
		error: (e: unknown): e is Error => e instanceof Error,
	} satisfies SchemaSpec
	return hasSchema(x, schema)
}

/**
 * True when an unknown value looks like a provider object (useValue/useFactory/useClass).
 * @param x
 * @returns -
 * @example
 */
export function isProviderObject(x: unknown): x is Readonly<Record<string, unknown>> & ({ useValue: unknown } | { useFactory: unknown } | { useClass: unknown }) {
	return isObject(x) && (hasOwn(x, 'useValue') || hasOwn(x, 'useFactory') || hasOwn(x, 'useClass'))
}

/**
 * True when the provider input is a raw value (not a provider object).
 * @param p
 * @returns -
 * @example
 */
export function isRawProviderValue<T>(p: Provider<T>): p is T {
	return !isProviderObject(p)
}

/**
 * Guard for aggregate lifecycle error shape used by DiagnosticAdapter.aggregate
 * @param x
 * @returns -
 * @example
 */
export function isAggregateLifecycleError(x: unknown): x is AggregateLifecycleError {
	const schema = {
		details: arrayOf(isLifecycleErrorDetail),
		errors: arrayOf((e: unknown): e is Error => e instanceof Error),
	} satisfies SchemaSpec
	return hasSchema(x, schema)
}
