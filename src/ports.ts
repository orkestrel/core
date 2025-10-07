import type { Token, TokensOf } from './types.js'
import { createTokens, createToken } from './types.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import { NoopLogger } from './adapters/logger'

/**
 * Create a set of Port tokens based on a shape.
 *
 * Keys of the shape become token names and their value types define the token types.
 * @param shape - Object whose keys are port names and values define their TypeScript interface shapes.
 * @param namespace - Optional namespace used in token descriptions (default: 'ports').
 */
export function createPortTokens<T extends Record<string, unknown>>(shape: T, namespace = 'ports'): TokensOf<T> {
	return createTokens(namespace, shape)
}

/**
 * Extend an existing token set with additional ports or create a new one.
 *
 * @remarks Duplicate keys are rejected to protect against accidental overrides.
 * @overload
 * Extend from scratch using only an extension shape.
 */
export function extendPorts<Ext extends Record<string, unknown>>(ext: Ext): Readonly<TokensOf<Ext>>
/**
 * @overload
 * Extend an existing base token set with an extension shape.
 */
export function extendPorts<Base extends Record<string, Token<unknown>>, Ext extends Record<string, unknown>>(base: Base, ext: Ext): Readonly<Base & TokensOf<Ext>>
export function extendPorts<Base extends Record<string, Token<unknown>>, Ext extends Record<string, unknown>>(
	baseOrExt: Base | Ext,
	maybeExt?: Ext,
): Readonly<TokensOf<Ext>> | Readonly<Base & TokensOf<Ext>> {
	if (maybeExt === undefined) {
		const ext = baseOrExt as Ext
		const newTokens = createTokens('ports', ext)
		return Object.freeze({ ...newTokens })
	}
	const base = baseOrExt as Base
	const ext = maybeExt
	for (const k of Object.keys(ext)) {
		if (k in base) {
			new DiagnosticAdapter({ logger: new NoopLogger() }).fail('ORK1040', { scope: 'internal', message: `extendPorts: duplicate port key '${k}'` })
		}
	}
	const newTokens = createTokens('ports', ext)
	return Object.freeze({ ...base, ...newTokens })
}

/**
 * Convenience helper to create a single Port token with a stable description.
 * @param name - Port name appended to the 'ports:' namespace.
 */
export function createPortToken<T>(name: string): Token<T> {
	return createToken<T>(`ports:${name}`)
}
