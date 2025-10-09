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
 * @param x - Value to check
 * @returns True if x is a non-null object (including arrays), false otherwise
 *
 * @example
 * ```ts
 * isObject({}) // true
 * isObject([]) // true
 * isObject(null) // false
 * isObject('string') // false
 * ```
 */
export function isObject(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null
}

/**
 * Check whether a value is a string primitive.
 *
 * @param x - Value to check
 * @returns True if x is a string, false otherwise
 *
 * @example
 * ```ts
 * isString('hello') // true
 * isString(123) // false
 * ```
 */
export function isString(x: unknown): x is string {
	return typeof x === 'string'
}

/**
 * Check whether a value is a boolean primitive.
 *
 * @param x - Value to check
 * @returns True if x is a boolean, false otherwise
 *
 * @example
 * ```ts
 * isBoolean(true) // true
 * isBoolean(1) // false
 * ```
 */
export function isBoolean(x: unknown): x is boolean {
	return typeof x === 'boolean'
}

/**
 * Check whether a value is a finite number (excludes NaN and Infinity).
 *
 * @param x - Value to check
 * @returns True if x is a finite number, false otherwise
 *
 * @example
 * ```ts
 * isFiniteNumber(42) // true
 * isFiniteNumber(NaN) // false
 * isFiniteNumber(Infinity) // false
 * ```
 */
export function isFiniteNumber(x: unknown): x is number {
	return typeof x === 'number' && Number.isFinite(x)
}

/**
 * Build a guard for arrays whose elements satisfy a provided element guard.
 *
 * @typeParam T - Element type produced by the element guard
 * @param elem - Guard function to validate each array element
 * @returns Guard function that checks if a value is an array with all elements satisfying the element guard
 *
 * @example
 * ```ts
 * const isStringArray = arrayOf(isString)
 * isStringArray(['a','b']) // true
 * isStringArray(['a', 1]) // false
 * isStringArray([]) // true (empty array)
 * ```
 */
export function arrayOf<T>(elem: Guard<T>): Guard<ReadonlyArray<T>> {
	return (x: unknown): x is ReadonlyArray<T> => Array.isArray(x) && x.every(elem)
}

/**
 * Build a guard for a literal union by value equality.
 *
 * @typeParam Literals - Tuple type of literal values
 * @param literals - Literal values to match against
 * @returns Guard function that checks if a value equals one of the provided literals
 *
 * @example
 * ```ts
 * const isEnv = literalOf('dev', 'staging', 'prod' as const)
 * isEnv('dev') // true
 * isEnv('test') // false
 *
 * const isStatus = literalOf(200, 404, 500)
 * isStatus(200) // true
 * isStatus(201) // false
 * ```
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
 *
 * Provides multiple overloads to preserve the original object type when known. Uses
 * Object.prototype.hasOwnProperty to check for own keys, not inherited ones.
 *
 * @param obj - Value to check for own keys
 * @param key - Single key or multiple keys to check
 * @returns True if obj is an object and owns all specified keys, false otherwise
 *
 * @example
 * ```ts
 * function processUser(x: unknown) {
 *   if (hasOwn(x, 'id', 'name')) {
 *     // x is now Record<'id' | 'name', unknown>
 *     console.log(x.id, x.name)
 *   }
 * }
 *
 * const user = { id: 1, name: 'Alice' }
 * if (hasOwn(user, 'email')) {
 *   // user is { id: number, name: string } & Record<'email', unknown>
 *   console.log(user.email)
 * }
 * ```
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
 * Validates that an unknown value is an object with keys matching the schema specification.
 * Each schema rule can be a typeof string ('string', 'number', etc.), a nested schema object,
 * or a custom guard function. The return type is automatically inferred from the schema.
 *
 * @typeParam S - The schema specification type
 * @param obj - Value to validate against the schema
 * @param schema - Object schema defining required keys and their types
 * @returns True if obj matches the schema structure, false otherwise
 *
 * @example
 * ```ts
 * const userSchema = {
 *   id: 'string',
 *   age: 'number',
 *   config: { retries: 'number', timeout: 'number' }
 * } as const
 *
 * function processUser(x: unknown) {
 *   if (hasSchema(x, userSchema)) {
 *     // x is now { id: string, age: number, config: { retries: number, timeout: number } }
 *     console.log(x.id, x.age, x.config.retries)
 *   }
 * }
 * ```
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
 * Each key in the shape becomes a token name, and the TypeScript type of the value
 * becomes the token's generic type parameter. All tokens share the same namespace prefix.
 *
 * @typeParam T - Shape whose property types become the token types
 * @param namespace - Description prefix for token symbols (e.g., 'ports', 'services')
 * @param shape - Object whose keys become token names and types define token value types
 * @returns Frozen map of tokens keyed by the shape's keys
 *
 * @example
 * ```ts
 * interface Services {
 *   database: DatabasePort
 *   cache: CachePort
 * }
 * const tokens = createTokens('services', {
 *   database: undefined as DatabasePort,
 *   cache: undefined as CachePort
 * })
 * // tokens.database is Token<DatabasePort>
 * // tokens.cache is Token<CachePort>
 * container.set(tokens.database, new PostgresDatabase())
 * ```
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
 * @param x - Value to check
 * @returns True if x is a symbol (Token), false otherwise
 *
 * @example
 * ```ts
 * const token = createToken('myToken')
 * isToken(token) // true
 * isToken('myToken') // false
 * ```
 */
export function isToken(x: unknown): x is Token<unknown> {
	return typeof x === 'symbol'
}

/**
 * Guard for arrays of tokens.
 *
 * @param x - Value to check
 * @returns True if x is an array of symbols (tokens), false otherwise
 *
 * @example
 * ```ts
 * const A = createToken('A')
 * const B = createToken('B')
 * isTokenArray([A, B]) // true
 * isTokenArray([A, 'B']) // false
 * ```
 */
export function isTokenArray(x: unknown): x is ReadonlyArray<Token<unknown>> {
	return Array.isArray(x) && x.every(isToken)
}

/**
 * Guard that checks an object is a map whose values are all tokens.
 *
 * @param x - Value to check
 * @returns True if x is an object (not array) with all values being tokens, false otherwise
 *
 * @example
 * ```ts
 * const A = createToken('A')
 * const B = createToken('B')
 * isTokenRecord({ a: A, b: B }) // true
 * isTokenRecord([A, B]) // false (arrays not allowed)
 * isTokenRecord({ a: A, b: 'B' }) // false (mixed values)
 * ```
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
 * Check if provider has a ValueProvider shape ({ useValue }).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is a ValueProvider, false otherwise
 *
 * @example
 * ```ts
 * isValueProvider({ useValue: 42 }) // true
 * isValueProvider({ useFactory: () => 42 }) // false
 * ```
 */
export function isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> {
	return isObject(p) && hasOwn(p, 'useValue')
}

/**
 * Check if provider has a FactoryProvider shape ({ useFactory }).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is a FactoryProvider, false otherwise
 *
 * @example
 * ```ts
 * isFactoryProvider({ useFactory: () => 42 }) // true
 * isFactoryProvider({ useValue: 42 }) // false
 * ```
 */
export function isFactoryProvider<T>(p: Provider<T>): p is FactoryProvider<T> {
	return isObject(p) && hasOwn(p, 'useFactory')
}

/**
 * Check if provider has a ClassProvider shape ({ useClass }).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is a ClassProvider, false otherwise
 *
 * @example
 * ```ts
 * class MyService {}
 * isClassProvider({ useClass: MyService }) // true
 * isClassProvider({ useFactory: () => new MyService() }) // false
 * ```
 */
export function isClassProvider<T>(p: Provider<T>): p is ClassProvider<T> {
	return isObject(p) && hasOwn(p, 'useClass')
}

/**
 * Check if class provider uses tuple injection (inject: [A, B, ...]).
 *
 * @typeParam T - Provider value type
 * @typeParam A - Tuple type of injected dependencies
 * @param p - Provider to check
 * @returns True if p is a ClassProvider with tuple inject, false otherwise
 */
export function isClassProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | ClassProvider<T>): p is ClassProviderWithTuple<T, A> {
	return isObject(p) && hasOwn(p, 'useClass', 'inject') && Array.isArray(p.inject)
}

/**
 * Check if class provider uses object injection (inject: { a: A, b: B }).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is a ClassProvider with object inject, false otherwise
 */
export function isClassProviderWithObject<T>(p: Provider<T> | ClassProvider<T>): p is ClassProvider<T> & { useClass: new (deps: Record<string, unknown>) => T, inject: Record<string, Token<unknown>> } {
	return isClassProvider(p) && hasOwn(p, 'inject') && isObject(p.inject) && !Array.isArray(p.inject)
}

/**
 * Check if class provider receives Container as constructor argument.
 *
 * @typeParam T - Provider value type
 * @param p - ClassProvider to check
 * @returns True if p has useClass with at least one parameter and no inject, false otherwise
 */
export function isClassProviderWithContainer<T>(p: ClassProvider<T>): p is ClassProvider<T> & { useClass: (new (c: Container) => T) } {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length >= 1
}

/**
 * Check if class provider has no dependencies (zero-arg constructor).
 *
 * @typeParam T - Provider value type
 * @param p - ClassProvider to check
 * @returns True if p has useClass with zero parameters, false otherwise
 */
export function isClassProviderNoDeps<T>(p: ClassProvider<T>): p is { useClass: new () => T } {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length === 0
}

/**
 * Check if factory provider uses tuple injection (inject: [A, B, ...]).
 *
 * @typeParam T - Provider value type
 * @typeParam A - Tuple type of injected dependencies
 * @param p - Provider to check
 * @returns True if p is a FactoryProvider with tuple inject, false otherwise
 */
export function isFactoryProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithTuple<T, A> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && Array.isArray(p.inject)
}

/**
 * Check if factory provider uses object injection (inject: { a: A, b: B }).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is a FactoryProvider with object inject, false otherwise
 */
export function isFactoryProviderWithObject<T>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithObject<T, Record<string, unknown>> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && isObject(p.inject) && !Array.isArray(p.inject)
}

/**
 * Check if factory provider receives Container as function argument.
 *
 * @typeParam T - Provider value type
 * @param p - FactoryProvider to check
 * @returns True if p has useFactory with at least one parameter and no inject, false otherwise
 */
export function isFactoryProviderWithContainer<T>(p: FactoryProvider<T>): p is { useFactory: (c: Container) => T } {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length >= 1
}

/**
 * Check if factory provider has no dependencies (zero-arg function).
 *
 * @typeParam T - Provider value type
 * @param p - FactoryProvider to check
 * @returns True if p has useFactory with zero parameters, false otherwise
 */
export function isFactoryProviderNoDeps<T>(p: FactoryProvider<T>): p is { useFactory: () => T } {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length === 0
}

/**
 * Check if a function type accepts zero arguments.
 *
 * @typeParam T - Function return type
 * @param fn - Function to check
 * @returns True if fn.length is 0 (zero arguments), false otherwise
 */
export function isZeroArg<T>(fn: FactoryProviderNoDeps<T>['useFactory']): fn is () => T {
	return fn.length === 0
}

// ---------------------------
// General runtime helpers
// ---------------------------

/**
 * Return the internal [[Class]] tag string for a value.
 *
 * @param x - Value to inspect
 * @returns Internal [[Class]] tag (e.g., "[object Date]", "[object Array]", "[object Promise]")
 *
 * @example
 * ```ts
 * getTag([]) // "[object Array]"
 * getTag(new Date()) // "[object Date]"
 * getTag(Promise.resolve()) // "[object Promise]"
 * ```
 */
export function getTag(x: unknown): string {
	return Object.prototype.toString.call(x)
}

/**
 * Heuristic check for an async function (native or transpiled).
 *
 * Detects async functions by checking the [[Class]] tag or constructor name. Works with
 * both native async functions and transpiled versions.
 *
 * @param fn - Value to check
 * @returns True if fn appears to be an async function, false otherwise
 *
 * @example
 * ```ts
 * isAsyncFunction(async () => {}) // true
 * isAsyncFunction(() => {}) // false
 * isAsyncFunction(() => Promise.resolve()) // false (returns promise, but not async)
 * ```
 */
export function isAsyncFunction(fn: unknown): fn is (...args: unknown[]) => Promise<unknown> {
	if (typeof fn !== 'function') return false
	if (getTag(fn) === '[object AsyncFunction]') return true
	const proto = Object.getPrototypeOf(fn)
	const ctorName = typeof proto?.constructor?.name === 'string' ? proto.constructor.name : undefined
	return ctorName === 'AsyncFunction'
}

/**
 * Narrow a value to Promise-like (duck-typed thenable).
 *
 * Checks for a then method without requiring a real Promise instance. Useful for
 * detecting promise-like objects in environments with multiple Promise implementations.
 *
 * @typeParam T - Promised value type
 * @param x - Value to check
 * @returns True if x has a callable then method, false otherwise
 *
 * @example
 * ```ts
 * isPromiseLike(Promise.resolve(1)) // true
 * isPromiseLike({ then: (resolve) => resolve(2) }) // true
 * isPromiseLike({ then: 'not a function' }) // false
 * ```
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
 * Safely invoke an optional function with arguments, swallowing any errors.
 *
 * Useful for emitting optional callbacks, diagnostics, and listeners where you want
 * to avoid cascading failures. Any errors thrown by the function are silently caught.
 *
 * @typeParam TArgs - Tuple type of function arguments
 * @param fn - Optional function to invoke (no-op if undefined)
 * @param args - Arguments to pass to the function
 *
 * @example
 * ```ts
 * const onComplete = (result: number) => console.log('Done:', result)
 * safeInvoke(onComplete, 42) // logs "Done: 42"
 *
 * const mayFail = () => { throw new Error('oops') }
 * safeInvoke(mayFail) // error is swallowed, no exception thrown
 *
 * safeInvoke(undefined) // no-op, safe to call with undefined
 * ```
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
 *
 * @param token - Symbol token to format
 * @returns The token's description string, or the stringified token if no description
 *
 * @example
 * ```ts
 * const token = createToken('UserService')
 * tokenDescription(token) // "UserService"
 *
 * const anonToken = Symbol()
 * tokenDescription(anonToken) // "Symbol()"
 * ```
 */
export function tokenDescription(token: symbol): string {
	return token.description ?? String(token)
}

// ---------------------------
// Domain-specific guards
// ---------------------------

/**
 * Runtime guard for LifecycleErrorDetail using a schema definition.
 *
 * @param x - Value to validate
 * @returns True if x matches the LifecycleErrorDetail shape, false otherwise
 *
 * @example
 * ```ts
 * const detail = {
 *   tokenDescription: 'Database',
 *   phase: 'start',
 *   context: 'normal',
 *   timedOut: false,
 *   durationMs: 150,
 *   error: new Error('Connection failed')
 * }
 * isLifecycleErrorDetail(detail) // true
 * ```
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
 * Check if a value looks like a provider object (has useValue/useFactory/useClass).
 *
 * @param x - Value to check
 * @returns True if x is an object with at least one provider key, false otherwise
 *
 * @example
 * ```ts
 * isProviderObject({ useValue: 42 }) // true
 * isProviderObject({ useFactory: () => 42 }) // true
 * isProviderObject(42) // false (raw value)
 * ```
 */
export function isProviderObject(x: unknown): x is Readonly<Record<string, unknown>> & ({ useValue: unknown } | { useFactory: unknown } | { useClass: unknown }) {
	return isObject(x) && (hasOwn(x, 'useValue') || hasOwn(x, 'useFactory') || hasOwn(x, 'useClass'))
}

/**
 * Check if provider input is a raw value (not a provider object).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is not a provider object shape, false otherwise
 *
 * @example
 * ```ts
 * isRawProviderValue(42) // true
 * isRawProviderValue('hello') // true
 * isRawProviderValue({ useValue: 42 }) // false
 * ```
 */
export function isRawProviderValue<T>(p: Provider<T>): p is T {
	return !isProviderObject(p)
}

/**
 * Guard for aggregate lifecycle error shape used by DiagnosticAdapter.aggregate.
 *
 * @param x - Value to validate
 * @returns True if x has the AggregateLifecycleError shape with details and errors arrays, false otherwise
 *
 * @example
 * ```ts
 * const aggregateErr = {
 *   details: [{ tokenDescription: 'A', phase: 'start', context: 'normal', timedOut: false, durationMs: 0, error: new Error() }],
 *   errors: [new Error('failed')]
 * }
 * isAggregateLifecycleError(aggregateErr) // true
 * ```
 */
export function isAggregateLifecycleError(x: unknown): x is AggregateLifecycleError {
	const schema = {
		details: arrayOf(isLifecycleErrorDetail),
		errors: arrayOf((e: unknown): e is Error => e instanceof Error),
	} satisfies SchemaSpec
	return hasSchema(x, schema)
}
