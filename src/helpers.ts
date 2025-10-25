import { hasOwn } from '@orkestrel/validator'
import type {
	Token,
	Provider,
	AdapterProvider,
	AggregateLifecycleError,
	SchemaSpec,
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
	if (!x || typeof x !== 'object' || Array.isArray(x)) return false
	for (const key of Object.keys(x)) {
		const v = (x as Record<string, unknown>)[key]
		if (!isToken(v)) return false
	}
	return true
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
	return typeof p === 'object' && p !== null && hasOwn(p, 'adapter')
}

/**
 * Get the description string from a token symbol.
 *
 * @param token - Token to inspect
 * @returns The symbol description or '<anonymous>' if none
 * @example
 * ```ts
 * const T = createToken('MyToken')
 * tokenDescription(T) // 'MyToken'
 * ```
 */
export function tokenDescription(token: Token<unknown>): string {
	const desc = token.description
	return desc === undefined ? '<anonymous>' : desc
}

/**
 * Create an AggregateLifecycleError from multiple errors.
 *
 * @param code - Error code for this aggregate error
 * @param message - Human-readable error message
 * @param errors - Array of underlying errors
 * @returns An AggregateLifecycleError instance
 * @example
 * ```ts
 * const err = createAggregateError('ORK1234', 'Multiple failures', [err1, err2])
 * ```
 */
export function createAggregateError(code: string, message: string, errors: readonly Error[]): AggregateLifecycleError {
	const err = new Error(message) as AggregateLifecycleError
	// @ts-expect-error - adding custom properties
	err.errors = errors
	// @ts-expect-error - adding custom properties
	err.code = code
	return err
}

/**
 * Build a schema from a specification object.
 *
 * @param spec - Schema specification
 * @returns The same spec (identity function for type inference)
 * @example
 * ```ts
 * const userSchema = schema({ object: { name: { type: 'string' }, age: { type: 'number' } } })
 * ```
 */
export function schema<S extends SchemaSpec>(spec: S): S {
	return spec
}
