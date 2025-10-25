import { arrayOf, hasSchema, isBoolean, isError, isFunction, isNumber, isObject, isString, literalOf, hasOwn } from '@orkestrel/validator'
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
	AdapterProvider,
	AggregateLifecycleError,
	SchemaSpec,
	FactoryProviderWithContainer,
	ClassProviderWithObject,
	ClassProviderWithContainer,
	ClassProviderNoDeps,
	ProviderMatchHandlers,
	ProviderMatchReturnHandlers,
} from './types.js'
import type { Adapter } from './adapter.js'

/**
 * Create a unique Token (a branded `symbol`) with a human‑friendly description.
 *
 * @typeParam _T - The value type carried by the token (typing only)
 * @param description - The symbol description shown in diagnostics and logs
 * @returns A new unique token symbol
 * @example
 * ```ts
 * const Port = createToken<{ ping(): void }>('Port')
 * ```
 */
export function createToken<_T = unknown>(description: string): Token<_T> {
	return Symbol(description)
}

/**
 * Create a readonly map of tokens from a shape, namespaced by a prefix.
 *
 * Each key in `shape` becomes a token on the returned object. The token description
 * is built as `${namespace}:${key}` for consistent diagnostics.
 *
 * @typeParam T - Object shape whose property types become token types
 * @param namespace - Description prefix (e.g., `ports`, `services`)
 * @param shape - Object whose keys become token names and values define token types
 * @returns A frozen object mapping keys to tokens
 * @example
 * ```ts
 * const Ports = createTokens('ports', { http: 0 as number, log: '' as string })
 * // Ports.http: Token<number>, description: "ports:http"
 * // Ports.log:  Token<string>, description: "ports:log"
 * ```
 */
export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): Readonly<{ [K in keyof T & string]: Token<T[K]> }>
export function createTokens(namespace: string, shape: Record<string, unknown>) {
	const out: Record<string, symbol> = {}
	for (const key of Object.keys(shape)) out[key] = createToken(`${namespace}:${key}`)
	return Object.freeze(out)
}

/**
 * Guard that checks a value is a token (`symbol`).
 *
 * @param x - Value to check
 * @returns True if `x` is a `symbol`
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
 * @returns True if `x` is an array and all values are tokens
 * @example
 * ```ts
 * isTokenArray([Symbol('a'), Symbol('b')]) // true
 * ```
 */
export function isTokenArray(x: unknown): x is ReadonlyArray<Token<unknown>> {
	return Array.isArray(x) && x.every(isToken)
}

/**
 * Guard that checks an object is a string‑keyed record whose values are all tokens.
 *
 * @param x - Value to check
 * @returns True if `x` is a non‑array object and all own string keys map to tokens
 * @example
 * ```ts
 * isTokenRecord({ a: Symbol('a') }) // true
 * isTokenRecord([Symbol('a')])      // false (array)
 * ```
 */
export function isTokenRecord(x: unknown): x is Record<string, Token<unknown>> {
	if (!isObject(x) || Array.isArray(x)) return false
	for (const key of Object.keys(x)) {
		const v = (x as Record<string, unknown>)[key]
		if (!isToken(v)) return false
	}
	return true
}

/**
 * Check if a provider is a ValueProvider (`{ useValue }`).
 *
 * @typeParam T - Provided value type
 * @param p - Provider input
 * @returns True if `p` is a `ValueProvider`
 * @example
 * ```ts
 * isValueProvider({ useValue: 1 }) // true
 * ```
 */
export function isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> {
	return isObject(p) && hasOwn(p, 'useValue')
}

/**
 * Check if a provider is a FactoryProvider (`{ useFactory }`).
 *
 * @typeParam T - Provided value type
 * @param p - Provider input
 * @returns True if `p` is a `FactoryProvider`
 * @example
 * ```ts
 * isFactoryProvider({ useFactory: () => 1 }) // true
 * ```
 */
export function isFactoryProvider<T>(p: Provider<T>): p is FactoryProvider<T> {
	return isObject(p) && hasOwn(p, 'useFactory')
}

/**
 * Check if a provider is a ClassProvider (`{ useClass }`).
 *
 * @typeParam T - Provided value type
 * @param p - Provider input
 * @returns True if `p` is a `ClassProvider`
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
 * Check if a provider is an AdapterProvider (`{ adapter }`).
 *
 * @param p - Provider input
 * @returns True if `p` is an `AdapterProvider`
 * @example
 * ```ts
 * class MyAdapter extends Adapter {}
 * isAdapterProvider({ adapter: MyAdapter }) // true
 * ```
 */
export function isAdapterProvider<T extends Adapter>(p: Provider<T>): p is AdapterProvider<T> {
	return isObject(p) && hasOwn(p, 'adapter')
}

/**
 * Class provider that uses tuple injection (`inject: [A, B, ...]`).
 *
 * @typeParam T - Provided value type
 * @typeParam A - Tuple of injected dependency types
 * @param p - Provider input
 * @returns True if class provider injects via a tuple of tokens
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
 * Class provider that uses object injection (`inject: { a: A, b: B }`).
 *
 * @typeParam T - Provided value type
 * @param p - Provider input
 * @returns True if class provider injects via an object of tokens
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
 * Class provider whose constructor receives the Container as its first argument (no explicit `inject`).
 *
 * @typeParam T - Provided value type
 * @param p - Class provider input
 * @returns True if `useClass` constructor takes a `Container`
 * @example
 * ```ts
 * class S { constructor(_c: Container) {} }
 * isClassProviderWithContainer<number>({ useClass: S } as any)
 * ```
 */
export function isClassProviderWithContainer<T>(p: ClassProvider<T>): p is ClassProviderWithContainer<T> {
	return !hasOwn(p, 'inject') && isFunction(p.useClass) && p.useClass.length >= 1
}

/**
 * Class provider with a zero‑argument constructor (no dependencies).
 *
 * @typeParam T - Provided value type
 * @param p - Class provider input
 * @returns True if the `useClass` constructor has arity 0 and no `inject`
 * @example
 * ```ts
 * class S { constructor() {} }
 * isClassProviderNoDeps<number>({ useClass: S } as any)
 * ```
 */
export function isClassProviderNoDeps<T>(p: ClassProvider<T>): p is ClassProviderNoDeps<T> {
	return !hasOwn(p, 'inject') && isFunction(p.useClass) && p.useClass.length === 0
}

/**
 * Factory provider that uses tuple injection (`inject: [A, B, ...]`).
 *
 * @typeParam T - Provided value type
 * @typeParam A - Tuple of injected dependency types
 * @param p - Provider input
 * @returns True if factory provider injects via a tuple of tokens
 * @example
 * ```ts
 * const p = { useFactory: (a: number, b: string) => a + b.length, inject: [Symbol('A'), Symbol('B')] }
 * isFactoryProviderWithTuple<number, readonly [number, string]>p
 * ```
 */
export function isFactoryProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithTuple<T, A> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && isTokenArray(p.inject)
}

/**
 * Factory provider that uses object injection (`inject: { a: A, b: B }`).
 *
 * @typeParam T - Provided value type
 * @param p - Provider input
 * @returns True if factory provider injects via an object of tokens
 * @example
 * ```ts
 * const p = { useFactory: (d: { a: number, b: string }) => d.a + d.b.length, inject: { a: Symbol('A'), b: Symbol('B') } }
 * isFactoryProviderWithObject<number>p
 * ```
 */
export function isFactoryProviderWithObject<T>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithObject<T, Record<string, unknown>> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && isTokenRecord(p.inject)
}

/**
 * Factory provider whose function receives the Container as its first argument (no explicit `inject`).
 *
 * @typeParam T - Provided value type
 * @param p - Factory provider input
 * @returns True if `useFactory` takes a `Container`
 * @example
 * ```ts
 * const p = { useFactory: (c: Container) => 1 }
 * isFactoryProviderWithContainer<number>p
 * ```
 */
export function isFactoryProviderWithContainer<T>(p: FactoryProvider<T>): p is FactoryProviderWithContainer<T> {
	return !hasOwn(p, 'inject') && isFunction(p.useFactory) && p.useFactory.length >= 1
}

/**
 * Factory provider with a zero‑argument function (no dependencies).
 *
 * @typeParam T - Provided value type
 * @param p - Factory provider input
 * @returns True if the `useFactory` function has arity 0 and no `inject`
 * @example
 * ```ts
 * const fp: FactoryProviderNoDeps<number> = { useFactory: () => 1 }
 * isFactoryProviderNoDeps(fp) // true
 * ```
 */
export function isFactoryProviderNoDeps<T>(p: FactoryProvider<T>): p is FactoryProviderNoDeps<T> {
	return !hasOwn(p, 'inject') && isFunction(p.useFactory) && p.useFactory.length === 0
}

/**
 * Safely invoke an optional function with arguments, swallowing any errors.
 *
 * Useful for optional callbacks and diagnostic hooks. Errors are intentionally ignored
 * to avoid cascading failures in listeners/loggers.
 *
 * @typeParam TArgs - Tuple of argument types
 * @param fn - Optional function to call
 * @param args - Arguments to pass to `fn`
 * @returns void
 * @example
 * ```ts
 * safeInvoke((x: number) => console.log(x), 1)
 * safeInvoke(undefined, 'ignored')
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
 * Format token symbols consistently for logs and diagnostics.
 *
 * Returns the symbol description when available, otherwise `String(token)`.

 * @param token - Token symbol to format
 * @returns Token description or its string representation
 * @example
 * ```ts
 * tokenDescription(Symbol('User')) // 'User'
 * ```
 */
export function tokenDescription(token: symbol): string {
	return token.description ?? String(token)
}

/**
 * Runtime guard for `LifecycleErrorDetail` using a schema definition.
 *
 * Validates the expected error shape emitted by diagnostic aggregation helpers.
 *
 * @param x - Value to validate
 * @returns True if `x` matches the detail shape
 * @example
 * ```ts
 * const d = { tokenDescription: 'A', phase: 'start', context: 'normal', timedOut: false, durationMs: 1, error: new Error('x') }
 * isLifecycleErrorDetail(d) // true
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
		durationMs: isNumber,
		error: (e: unknown): e is Error => isError(e),
	} satisfies SchemaSpec
	return hasSchema(x, schema)
}

/**
 * Check if a value looks like a provider object (has one of `useValue`/`useFactory`/`useClass`).
 *
 * @param x - Value to check
 * @returns True if `x` has at least one provider key
 * @example
 * ```ts
 * isProviderObject({ useValue: 1 }) // true
 * ```
 */
export function isProviderObject(x: unknown): x is Readonly<Record<string, unknown>> & ({ useValue: unknown } | { useFactory: unknown } | { useClass: unknown }) {
	return isObject(x) && (hasOwn(x, 'useValue') || hasOwn(x, 'useFactory') || hasOwn(x, 'useClass'))
}

/**
 * Check if a provider input is a raw value (i.e., not a provider object).
 *
 * @typeParam T - Provided value type
 * @param p - Provider input
 * @returns True if `p` is not an object provider
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
 * @returns True if `x` has `details` and `errors` arrays of the expected element types
 * @example
 * ```ts
 * const agg = { details: [], errors: [] }
 * isAggregateLifecycleError(agg) // true
 * ```
 */
export function isAggregateLifecycleError(x: unknown): x is AggregateLifecycleError {
	const schema = {
		details: arrayOf(isLifecycleErrorDetail),
		errors: arrayOf((e: unknown): e is Error => isError(e)),
	} satisfies SchemaSpec
	return hasSchema(x, schema)
}

/**
 * Match a provider against its specific shape and dispatch to typed handlers.
 *
 * Recognized shapes (checked in order):
 * 1) raw value (not a provider object)
 * 2) value provider: `{ useValue }`
 * 3) factory providers: tuple | object | container | noDeps
 * 4) class providers: tuple | object | container | noDeps
 *
 * @typeParam T - Value type produced by the provider
 * @typeParam R - Return type when using return handlers (inferred)
 * @param provider - Provider input (raw value or provider object)
 * @param h - Handlers for each supported provider shape
 * @returns When handlers return `Provider<T>`, the normalized `Provider<T>`; otherwise the custom type `R`
 * @throws Error with code `ORK1099` when the provider shape is unknown (internal invariant)
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
	if (isRawProviderValue(provider)) return h.raw(provider as T)

	// Value provider
	if (isValueProvider(provider)) return h.value(provider)

	// Adapter provider
	if (isAdapterProvider(provider)) return h.adapter(provider as any) as any

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
