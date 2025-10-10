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
	Guard,
	SchemaSpec,
	FromSchema,
	FactoryProviderWithContainer,
	ClassProviderWithObject,
	ClassProviderWithContainer,
	ClassProviderNoDeps,
	ProviderMatchHandlers,
	ProviderMatchReturnHandlers,
} from './types.js'

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
 * isBoolean(0) // false
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
 * @returns Guard that checks an array whose elements satisfy elem
 *
 * @example
 * ```ts
 * const isStringArray = arrayOf(isString)
 * isStringArray(['a','b']) // true
 * isStringArray(['a', 1]) // false
 * ```
 */
export function arrayOf<T>(elem: Guard<T>): Guard<ReadonlyArray<T>> {
	return (x: unknown): x is ReadonlyArray<T> => Array.isArray(x) && x.every(elem)
}

/**
 * Build a guard for a literal union by value equality.
 *
 * @typeParam Literals - Tuple of literal values
 * @param literals - Values that are considered valid
 * @returns Guard that matches when x equals one of the literals
 *
 * @example
 * ```ts
 * const isEnv = literalOf('dev', 'prod' as const)
 * isEnv('dev') // true
 * isEnv('staging') // false
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

/**
 * Narrow an unknown to an object that owns the given key(s) (non-prototype).
 *
 * Overloads preserve the original type when known.
 *
 * @param obj - Value to check
 * @param key - One or more keys to require on the object
 * @returns True when obj is an object and owns all keys
 *
 * @example
 * ```ts
 * if (hasOwn(x, 'id', 'name')) {
 *   // x: Record<'id' | 'name', unknown>
 * }
 * ```
 */
// Overload: hasOwn(obj, key)
export function hasOwn<K extends PropertyKey>(obj: unknown, key: K): obj is Record<K, unknown>
// Overload: hasOwn(obj, ...keys)
export function hasOwn<Ks extends readonly PropertyKey[]>(obj: unknown, ...keys: Ks): obj is { [P in Ks[number]]: unknown }
// Overload: hasOwn<T>(obj, key)
export function hasOwn<T extends object, K extends PropertyKey>(obj: T, key: K): obj is T & Record<K, unknown>
// Overload: hasOwn<T>(obj, ...keys)
export function hasOwn<T extends object, Ks extends readonly PropertyKey[]>(obj: T, ...keys: Ks): obj is T & { [P in Ks[number]]: unknown }
export function hasOwn(obj: unknown, ...keys: readonly PropertyKey[]): boolean {
	if (!isObject(obj)) return false
	for (const k of keys) if (!Object.prototype.hasOwnProperty.call(obj, k)) return false
	return true
}

/**
 * Check that a value matches an object schema at runtime, with static inference.
 *
 * @typeParam S - The schema specification type
 * @param obj - Value to validate
 * @param schema - Object schema defining required keys and types/guards
 * @returns True when the value satisfies the schema
 *
 * @example
 * ```ts
 * const userSchema = { id: 'string', age: 'number' } as const
 * if (hasSchema(x, userSchema)) console.log(x.id, x.age)
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

// Overload: createToken<T>(description)
export function createToken<_T = unknown>(description: string): Token<_T>
/**
 * Create a unique Token (a branded Symbol) with a human-friendly description.
 *
 * @typeParam _T - The value type carried by the token (typing only)
 * @param description - Symbol description used in diagnostics
 * @returns A new unique symbol token
 *
 * @example
 * ```ts
 * const UserRepo = createToken<{ getById(id: string): Promise<User> }>('repo:User')
 * ```
 */
export function createToken(description: string): symbol {
	return Symbol(description)
}

/**
 * Create a set of tokens from a shape under a given namespace.
 *
 * @typeParam T - Shape whose property types become the token types
 * @param namespace - Description prefix for token symbols (e.g., 'ports')
 * @param shape - Object whose keys become token names and types define token value types
 * @returns Frozen map of tokens keyed by the shape's keys
 *
 * @example
 * ```ts
 * const tokens = createTokens('services', { a: 0 as number, b: '' as string })
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
 * @returns True if x is a symbol
 *
 * @example
 * ```ts
 * isToken(Symbol('x')) // true
 * ```
 */
export function isToken(x: unknown): x is Token<unknown> {
	return typeof x === 'symbol'
}

/**
 * Guard for arrays of tokens.
 *
 * @param x - Value to check
 * @returns True if x is an array of symbols
 *
 * @example
 * ```ts
 * isTokenArray([Symbol('a'), Symbol('b')]) // true
 * ```
 */
export function isTokenArray(x: unknown): x is ReadonlyArray<Token<unknown>> {
	return Array.isArray(x) && x.every(isToken)
}

/**
 * Guard that checks an object is a map whose values are all tokens.
 *
 * @param x - Value to check
 * @returns True if x is an object (not array) with token values
 *
 * @example
 * ```ts
 * isTokenRecord({ a: Symbol('a') }) // true
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

/**
 * Check if provider has a ValueProvider shape (`{ useValue }`).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is ValueProvider
 *
 * @example
 * ```ts
 * isValueProvider({ useValue: 42 }) // true
 * ```
 */
export function isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> {
	return isObject(p) && hasOwn(p, 'useValue')
}

/**
 * Check if provider has a FactoryProvider shape (`{ useFactory }`).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is FactoryProvider
 *
 * @example
 * ```ts
 * isFactoryProvider({ useFactory: () => 1 }) // true
 * ```
 */
export function isFactoryProvider<T>(p: Provider<T>): p is FactoryProvider<T> {
	return isObject(p) && hasOwn(p, 'useFactory')
}

/**
 * Check if provider has a ClassProvider shape (`{ useClass }`).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if p is ClassProvider
 *
 * @example
 * ```ts
 * class S {}
 * isClassProvider({ useClass: S }) // true
 * ```
 */
export function isClassProvider<T>(p: Provider<T>): p is ClassProvider<T> {
	return isObject(p) && hasOwn(p, 'useClass')
}

/**
 * Check if class provider uses tuple injection (inject: `[A, B, ...]`).
 *
 * @typeParam T - Provider value type
 * @typeParam A - Tuple type of injected dependencies
 * @param p - Provider to check
 * @returns True if tuple-injected ClassProvider
 *
 * @example
 * ```ts
 * class S { constructor(_a: number, _b: string) {} }
 * isClassProviderWithTuple<number, readonly [number, string]>({ useClass: S, inject: [Symbol('A'), Symbol('B')] })
 * ```
 */
export function isClassProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | ClassProvider<T>): p is ClassProviderWithTuple<T, A> {
	return isObject(p) && hasOwn(p, 'useClass', 'inject') && isTokenArray(p.inject)
}

/**
 * Check if class provider uses object injection (inject: `{ a: A, b: B }`).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if object-injected ClassProvider
 *
 * @example
 * ```ts
 * class S { constructor(_deps: { a: number, b: string }) {} }
 * isClassProviderWithObject<number>({ useClass: S, inject: { a: Symbol('A'), b: Symbol('B') } } as any)
 * ```
 */
export function isClassProviderWithObject<T>(p: Provider<T> | ClassProvider<T>): p is ClassProviderWithObject<T, Record<string, unknown>> {
	return isClassProvider(p) && hasOwn(p, 'inject') && isTokenRecord(p.inject)
}

/**
 * Check if class provider receives Container as constructor argument.
 *
 * @typeParam T - Provider value type
 * @param p - ClassProvider to check
 * @returns True if constructor takes Container (and no explicit inject)
 *
 * @example
 * ```ts
 * class S { constructor(_c: Container) {} }
 * isClassProviderWithContainer<number>({ useClass: S } as any)
 * ```
 */
export function isClassProviderWithContainer<T>(p: ClassProvider<T>): p is ClassProviderWithContainer<T> {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length >= 1
}

/**
 * Check if class provider has no dependencies (zero-arg constructor).
 *
 * @typeParam T - Provider value type
 * @param p - ClassProvider to check
 * @returns True if zero-arg constructor (and no explicit inject)
 *
 * @example
 * ```ts
 * class S { constructor() {} }
 * isClassProviderNoDeps<number>({ useClass: S } as any)
 * ```
 */
export function isClassProviderNoDeps<T>(p: ClassProvider<T>): p is ClassProviderNoDeps<T> {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length === 0
}

/**
 * Check if factory provider uses tuple injection (inject: `[A, B, ...]`).
 *
 * @typeParam T - Provider value type
 * @typeParam A - Tuple type of injected dependencies
 * @param p - Provider to check
 * @returns True if tuple-injected FactoryProvider
 *
 * @example
 * ```ts
 * const p = { useFactory: (a: number, b: string) => a + b.length, inject: [Symbol('A'), Symbol('B')] }
 * isFactoryProviderWithTuple<number, readonly [number, string]>(p as any)
 * ```
 */
export function isFactoryProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithTuple<T, A> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && isTokenArray(p.inject)
}

/**
 * Check if factory provider uses object injection (inject: `{ a: A, b: B }`).
 *
 * @typeParam T - Provider value type
 * @param p - Provider to check
 * @returns True if object-injected FactoryProvider
 *
 * @example
 * ```ts
 * const p = { useFactory: (d: { a: number, b: string }) => d.a + d.b.length, inject: { a: Symbol('A'), b: Symbol('B') } }
 * isFactoryProviderWithObject<number>(p as any)
 * ```
 */
export function isFactoryProviderWithObject<T>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithObject<T, Record<string, unknown>> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && isTokenRecord(p.inject)
}

/**
 * Check if factory provider receives Container as function argument.
 *
 * @typeParam T - Provider value type
 * @param p - FactoryProvider to check
 * @returns True if factory takes Container (and no explicit inject)
 *
 * @example
 * ```ts
 * const p = { useFactory: (c: Container) => 1 }
 * isFactoryProviderWithContainer<number>(p as any)
 * ```
 */
export function isFactoryProviderWithContainer<T>(p: FactoryProvider<T>): p is FactoryProviderWithContainer<T> {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length >= 1
}

/**
 * Check if factory provider has no dependencies (zero-arg function).
 *
 * @typeParam T - Provider value type
 * @param p - FactoryProvider to check
 * @returns True if zero-arg factory (and no explicit inject)
 *
 * @example
 * ```ts
 * const fp: FactoryProviderNoDeps<number> = { useFactory: () => 1 }
 * isZeroArg(fp.useFactory) // true
 * ```
 */
export function isFactoryProviderNoDeps<T>(p: FactoryProvider<T>): p is FactoryProviderNoDeps<T> {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length === 0
}

/**
 * Check if a function type accepts zero arguments.
 *
 * @typeParam T - Function return type
 * @param fn - Function to check
 * @returns True if fn.length is 0
 *
 * @example
 * ```ts
 * const f = () => 42
 * isZeroArg(f) // true
 * ```
 */
export function isZeroArg<T>(fn: FactoryProviderNoDeps<T>['useFactory']): fn is () => T {
	return fn.length === 0
}

/**
 * Return the internal [[Class]] tag string for a value.
 *
 * @param x - Value to inspect
 * @returns Tag like "[object Array]" or "[object Date]"
 *
 * @example
 * ```ts
 * getTag([]) // "[object Array]"
 * ```
 */
export function getTag(x: unknown): string {
	return Object.prototype.toString.call(x)
}

/**
 * Heuristic check for an async function (native or transpiled).
 *
 * @param fn - Value to check
 * @returns True if fn appears to be an async function
 *
 * @example
 * ```ts
 * isAsyncFunction(async () => {}) // true
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
 * @typeParam T - Promised value type
 * @param x - Value to check
 * @returns True if x has a callable then method
 *
 * @example
 * ```ts
 * isPromiseLike(Promise.resolve(1)) // true
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
 * @typeParam TArgs - Tuple type of function arguments
 * @param fn - Optional function to invoke (no-op if undefined)
 * @param args - Arguments to pass to the function
 *
 * @example
 * ```ts
 * safeInvoke((x: number) => console.log(x), 1)
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
 * @returns The token's description or its string representation
 *
 * @example
 * ```ts
 * tokenDescription(Symbol('UserService')) // 'UserService'
 * ```
 */
export function tokenDescription(token: symbol): string {
	return token.description ?? String(token)
}

/**
 * Runtime guard for LifecycleErrorDetail using a schema definition.
 *
 * @param x - Value to validate
 * @returns True if x matches the expected shape
 *
 * @example
 * ```ts
 * const detail = { tokenDescription: 'A', phase: 'start', context: 'normal', timedOut: false, durationMs: 1, error: new Error('x') }
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
 * Check if a value looks like a provider object (has `useValue`/`useFactory`/`useClass`).
 *
 * @param x - Value to check
 * @returns True if x has at least one provider key
 *
 * @example
 * ```ts
 * isProviderObject({ useValue: 1 }) // true
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
 * @returns True if p is not a provider object
 *
 * @example
 * ```ts
 * isRawProviderValue(42) // true
 * ```
 */
export function isRawProviderValue<T>(p: Provider<T>): p is T {
	return !isProviderObject(p)
}

/**
 * Guard for aggregate lifecycle error shape used by DiagnosticAdapter.aggregate.
 *
 * @param x - Value to validate
 * @returns True if x has details and errors arrays
 *
 * @example
 * ```ts
 * const agg = { details: [], errors: [] }
 * isAggregateLifecycleError(agg) // true
 * ```
 */
export function isAggregateLifecycleError(x: unknown): x is AggregateLifecycleError {
	const schema = {
		details: arrayOf(isLifecycleErrorDetail),
		errors: arrayOf((e: unknown): e is Error => e instanceof Error),
	} satisfies SchemaSpec
	return hasSchema(x, schema)
}

/**
 * Match a provider against its specific shape and dispatch to typed handlers.
 *
 * @typeParam T - Value type produced by the provider
 * @typeParam R - Return type when using return handlers (inferred)
 * @param provider - Provider input (raw value or provider object)
 * @param h - Handlers for each supported provider shape
 * @returns When handlers return Provider<T>, the normalized Provider<T>; otherwise the custom type R
 *
 * @remarks
 * Recognized shapes (checked in order):
 * 1. raw value (not an object provider)
 * 2. value provider: `{ useValue }`
 * 3. factory providers: tuple | object | container | noDeps
 * 4. class providers: tuple | object | container | noDeps
 *
 * @throws Error with code ORK1099 when the provider shape is unknown (internal invariant)
 *
 * @example
 * ```ts
 * const out = matchProvider(42, {
 *   raw: v => ({ useValue: v }),
 *   value: p => p,
 *   factoryTuple: p => p,
 *   factoryObject: p => p,
 *   factoryContainer: p => p,
 *   factoryNoDeps: p => p,
 *   classTuple: p => p,
 *   classObject: p => p,
 *   classContainer: p => p,
 *   classNoDeps: p => p,
 * })
 * ```
 */
export function matchProvider<T>(provider: Provider<T>, h: ProviderMatchHandlers<T>): Provider<T>
export function matchProvider<T, R>(provider: Provider<T>, h: ProviderMatchReturnHandlers<T, R>): R
export function matchProvider<T, R>(provider: Provider<T>, h: ProviderMatchHandlers<T> | ProviderMatchReturnHandlers<T, R>): Provider<T> | R {
	// Raw value (not a provider object)
	if (isRawProviderValue(provider)) return h.raw(provider)

	// Value provider
	if (isValueProvider(provider)) return h.value(provider)

	// Factory providers
	if (isFactoryProvider(provider)) {
		if (isFactoryProviderWithTuple(provider)) return h.factoryTuple(provider)
		if (isFactoryProviderWithObject(provider)) return h.factoryObject(provider)
		if (isFactoryProviderWithContainer(provider)) return h.factoryContainer(provider)
		if (isFactoryProviderNoDeps(provider)) return h.factoryNoDeps(provider)
	}

	// Class providers
	if (isClassProvider(provider)) {
		if (isClassProviderWithTuple(provider)) return h.classTuple(provider)
		if (isClassProviderWithObject(provider)) return h.classObject(provider)
		if (isClassProviderWithContainer(provider)) return h.classContainer(provider)
		if (isClassProviderNoDeps(provider)) return h.classNoDeps(provider)
	}

	// Unknown shape: throw an internal invariant error
	throw Object.assign(new Error('Unknown provider shape'), { code: 'ORK1099', scope: 'internal' })
}
