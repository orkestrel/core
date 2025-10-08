// Shared runtime helper implementations consolidated here.

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
} from './types.js'
import type { Container } from './container.js'

// ---------------------------
// Narrowing primitives and contracts
// ---------------------------

export type Guard<T> = (x: unknown) => x is T

/** True objects (excludes null). */
export function isObject(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null
}

export function isString(x: unknown): x is string {
	return typeof x === 'string'
}

export function isBoolean(x: unknown): x is boolean {
	return typeof x === 'boolean'
}

export function isFiniteNumber(x: unknown): x is number {
	return typeof x === 'number' && Number.isFinite(x)
}

/** Guard for arrays with element guard. */
export function arrayOf<T>(elem: Guard<T>): Guard<ReadonlyArray<T>> {
	return (x: unknown): x is ReadonlyArray<T> => Array.isArray(x) && x.every(elem)
}

/** Guard for literal unions (by value equality). */
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

export type PrimitiveTag = 'string' | 'number' | 'boolean' | 'symbol' | 'bigint' | 'function' | 'object'

export type SchemaSpec = Readonly<{ [k: string]: SchemaSpec | PrimitiveTag | Guard<unknown> }>

// Resolve a single rule to a TS type
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

export type FromSchema<S extends SchemaSpec> = { [K in keyof S]: ResolveRule<S[K]> }

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

export function createToken<_T = unknown>(description: string): Token<_T>
export function createToken(description: string): symbol {
	return Symbol(description)
}

export function createTokens<T extends Record<string, unknown>>(namespace: string, shape: T): Readonly<{ [K in keyof T & string]: Token<T[K]> }>
export function createTokens(namespace: string, shape: Record<string, unknown>) {
	const out: Record<string, symbol> = {}
	for (const key of Object.keys(shape)) out[key] = createToken(`${namespace}:${key}`)
	return Object.freeze(out)
}

export function isToken(x: unknown): x is Token<unknown> {
	return typeof x === 'symbol'
}

/** Array guard specialized for tokens. */
export function isTokenArray(x: unknown): x is ReadonlyArray<Token<unknown>> {
	return Array.isArray(x) && x.every(isToken)
}

/** Guard that checks an object is a map whose values are tokens. */
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

export function isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> {
	return isObject(p) && hasOwn(p, 'useValue')
}

export function isFactoryProvider<T>(p: Provider<T>): p is FactoryProvider<T> {
	return isObject(p) && hasOwn(p, 'useFactory')
}

export function isClassProvider<T>(p: Provider<T>): p is ClassProvider<T> {
	return isObject(p) && hasOwn(p, 'useClass')
}

export function isClassProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | ClassProvider<T>): p is ClassProviderWithTuple<T, A> {
	return isObject(p) && hasOwn(p, 'useClass', 'inject') && Array.isArray(p.inject)
}

export function isClassProviderWithObject<T>(p: Provider<T> | ClassProvider<T>): p is ClassProvider<T> & { useClass: new (deps: Record<string, unknown>) => T, inject: Record<string, Token<unknown>> } {
	return isClassProvider(p) && hasOwn(p, 'inject') && isObject(p.inject) && !Array.isArray(p.inject)
}

export function isClassProviderWithContainer<T>(p: ClassProvider<T>): p is ClassProvider<T> & { useClass: (new (c: Container) => T) } {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length >= 1
}

export function isClassProviderNoDeps<T>(p: ClassProvider<T>): p is { useClass: new () => T } {
	return !hasOwn(p, 'inject') && typeof p.useClass === 'function' && p.useClass.length === 0
}

export function isFactoryProviderWithTuple<T, A extends readonly unknown[]>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithTuple<T, A> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && Array.isArray(p.inject)
}

export function isFactoryProviderWithObject<T>(p: Provider<T> | FactoryProvider<T>): p is FactoryProviderWithObject<T, Record<string, unknown>> {
	return isFactoryProvider(p) && hasOwn(p, 'inject') && isObject(p.inject) && !Array.isArray(p.inject)
}

export function isFactoryProviderWithContainer<T>(p: FactoryProvider<T>): p is { useFactory: (c: Container) => T } {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length >= 1
}

export function isFactoryProviderNoDeps<T>(p: FactoryProvider<T>): p is { useFactory: () => T } {
	return !hasOwn(p, 'inject') && typeof p.useFactory === 'function' && p.useFactory.length === 0
}

export function isZeroArg<T>(fn: FactoryProviderNoDeps<T>['useFactory']): fn is () => T {
	return fn.length === 0
}

// ---------------------------
// General runtime helpers
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
	if (!hasOwn(x, 'then')) return false
	return typeof x.then === 'function'
}

/** Safely invoke an optional function with arguments; swallows any errors. */
export function safeInvoke<TArgs extends unknown[]>(fn: ((...args: TArgs) => unknown | Promise<unknown>) | undefined, ...args: TArgs): void {
	try {
		fn?.(...args)
	}
	catch {
		/* swallow */
	}
}

// Helper to format token symbols consistently
export function tokenDescription(token: symbol): string {
	return token.description ?? String(token)
}

// ---------------------------
// Domain-specific guards
// ---------------------------

// Runtime guard for LifecycleErrorDetail using schema
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

export function isProviderObject(x: unknown): x is Readonly<Record<string, unknown>> & ({ useValue: unknown } | { useFactory: unknown } | { useClass: unknown }) {
	return isObject(x) && (hasOwn(x, 'useValue') || hasOwn(x, 'useFactory') || hasOwn(x, 'useClass'))
}

export function isRawProviderValue<T>(p: Provider<T>): p is T {
	return !isProviderObject(p)
}
