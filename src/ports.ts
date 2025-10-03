import type { Token, TokensOf } from './types.js'
import { createTokens } from './types.js'

/**
 * Create a set of Port tokens based on a shape.
 *
 * Keys of the shape become token names and their value types define the token types.
 * @param shape - Object whose keys are port names and values define their TypeScript interface shapes.
 * @param namespace - Optional namespace used in token descriptions (default: 'ports').
 */
export function createPortTokens<T extends Record<string, unknown>>(shape: T, namespace = 'ports'): TokensOf<T> {
	return createTokens(namespace, shape as Record<string, unknown>) as TokensOf<T>
}

/**
 * Extend an existing token set with additional ports or create a new one.
 *
 * @remarks Duplicate keys are rejected to protect against accidental overrides.
 * @overload
 * Extend from scratch using only an extension shape.
 */
export function extendPorts<Ext extends Record<string, unknown>>(ext: Ext): TokensOf<Ext>
/**
 * @overload
 * Extend an existing base token set with an extension shape.
 */
export function extendPorts<Base extends Record<string, Token<unknown>>, Ext extends Record<string, unknown>>(base: Base, ext: Ext): Base & TokensOf<Ext>
export function extendPorts(...args: unknown[]): unknown {
	const base: Record<string, Token<unknown>> = (args.length === 2 ? (args[0] as Record<string, Token<unknown>>) : {})
	const extShape: Record<string, unknown> = (args.length === 2 ? (args[1] as Record<string, unknown>) : (args[0] as Record<string, unknown>))
	for (const k of Object.keys(extShape)) {
		if (k in base) throw new Error(`extendPorts: duplicate port key '${k}'`)
	}
	const newTokens = createTokens('ports', extShape)
	const merged = Object.freeze({ ...base, ...newTokens })
	return merged as unknown
}

/**
 * Convenience helper to create a single Port token with a stable description.
 * @param name - Port name appended to the 'ports:' namespace.
 */
export function createPortToken<T>(name: string): Token<T> {
	return createTokens('ports', { [name]: {} as T })[name]
}
