import type {
	Token,
	AdapterProvider,
	AggregateLifecycleErrorLike,
} from './types.js'
import type { Adapter } from './adapter.js'

// -----------------------------------------------------------------------------
// Native Type Guards (replacing @orkestrel/validator)
// -----------------------------------------------------------------------------

/**
 * Type guard for string values.
 *
 * @param x - Value to check
 * @returns True if `x` is a string
 */
export function isString(x: unknown): x is string {
	return typeof x === 'string'
}

/**
 * Type guard for number values (excludes NaN).
 *
 * @param x - Value to check
 * @returns True if `x` is a number and not NaN
 */
export function isNumber(x: unknown): x is number {
	return typeof x === 'number' && !Number.isNaN(x)
}

/**
 * Type guard for boolean values.
 *
 * @param x - Value to check
 * @returns True if `x` is a boolean
 */
export function isBoolean(x: unknown): x is boolean {
	return typeof x === 'boolean'
}

/**
 * Type guard for function values.
 *
 * @param x - Value to check
 * @returns True if `x` is a function
 */
export function isFunction(x: unknown): x is (...args: unknown[]) => unknown {
	return typeof x === 'function'
}

/**
 * Type guard for plain objects (non-null, non-array).
 *
 * @param x - Value to check
 * @returns True if `x` is a non-null, non-array object
 */
export function isRecord(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/**
 * Type guard for Error instances.
 *
 * @param x - Value to check
 * @returns True if `x` is an Error instance
 */
export function isError(x: unknown): x is Error {
	return x instanceof Error
}

/**
 * Type guard for array values.
 *
 * @param x - Value to check
 * @returns True if `x` is an array
 */
export function isArray(x: unknown): x is readonly unknown[] {
	return Array.isArray(x)
}

/**
 * Creates a type guard that checks if a value is one of the specified literals.
 *
 * @param values - The literal values to check against
 * @returns A type guard function
 */
export function isLiteral<T extends readonly string[]>(...values: T): (x: unknown) => x is T[number] {
	return (x: unknown): x is T[number] => values.includes(x as T[number])
}

/**
 * Creates a type guard that checks if all elements in an array match the given guard.
 *
 * @param guard - The type guard to apply to each element
 * @returns A type guard for arrays where all elements match
 */
export function isArrayOf<T>(guard: (x: unknown) => x is T): (x: unknown) => x is readonly T[] {
	return (x: unknown): x is readonly T[] => Array.isArray(x) && x.every(guard)
}

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
export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): Readonly<{ [K in keyof T & string]: Token<T[K]> }>;
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
export function isTokenArray(x: unknown): x is readonly Token<unknown>[] {
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
	if (!isRecord(x) || Array.isArray(x)) return false
	for (const key of Object.keys(x)) {
		if (!isToken(x[key])) return false
	}
	return true
}

/**
 * Check if a constructor is an AdapterSubclass with static lifecycle methods.
 *
 * @param ctor - Constructor to check
 * @returns True if `ctor` has the static Adapter lifecycle methods
 * @example
 * ```ts
 * class MyAdapter extends Adapter { static instance?: MyAdapter; }
 * isAdapterSubclass(MyAdapter) // true
 * isAdapterSubclass({}) // false
 * ```
 */
export function isAdapterSubclass(ctor: unknown): ctor is typeof Adapter {
	return (
		typeof ctor === 'function' &&
		'start' in ctor &&
		typeof ctor.start === 'function' &&
		'stop' in ctor &&
		typeof ctor.stop === 'function' &&
		'destroy' in ctor &&
		typeof ctor.destroy === 'function'
	)
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
export function isAdapterProvider<T extends Adapter>(p: unknown): p is AdapterProvider<T> {
	return isRecord(p) && Object.hasOwn(p, 'adapter')
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
export function safeInvoke<TArgs extends unknown[]>(fn: ((...args: TArgs) => unknown) | undefined, ...args: TArgs): void {
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
	tokenDescription: string;
	phase: 'start' | 'stop' | 'destroy';
	context: 'normal' | 'rollback' | 'container';
	timedOut: boolean;
	durationMs: number;
	error: Error;
} {
	if (!isRecord(x)) return false
	const isPhase = isLiteral('start', 'stop', 'destroy')
	const isContext = isLiteral('normal', 'rollback', 'container')
	return (
		'tokenDescription' in x
		&& isString(x.tokenDescription)
		&& 'phase' in x
		&& isPhase(x.phase)
		&& 'context' in x
		&& isContext(x.context)
		&& 'timedOut' in x
		&& isBoolean(x.timedOut)
		&& 'durationMs' in x
		&& isNumber(x.durationMs)
		&& 'error' in x
		&& isError(x.error)
	)
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
export function isAggregateLifecycleError(x: unknown): x is AggregateLifecycleErrorLike {
	if (!isRecord(x)) return false
	return (
		'details' in x
		&& isArrayOf(isLifecycleErrorDetail)(x.details)
		&& 'errors' in x
		&& isArrayOf(isError)(x.errors)
	)
}
