import type { Token, TokensOf } from './types.js'
import { createTokens, createToken } from './helpers.js'
import { DiagnosticAdapter } from './adapters/diagnostic.js'
import { NoopLogger } from './adapters/logger'
import { PORTS_MESSAGES } from './constants.js'

/**
 * Create a read-only set of Port tokens from a shape object.
 *
 * Each key in the provided shape becomes a token in the returned object, and the value's TypeScript type
 * is used as the token's generic type parameter.
 *
 * @param shape - Object whose keys are port names and values define the token types via their TypeScript shape.
 * @param namespace - Optional namespace prefix used in token descriptions (default: 'ports').
 * @returns A frozen map of tokens keyed by the provided shape's keys.
 * @see extendPorts
 *
 * @example Basic usage: create a tokens map and resolve values from a Container.
 * ```ts
 * import { createPortTokens, Container } from '@orkestrel/core'
 * const ports = createPortTokens({ logger: undefined as { info(msg: string): void } })
 * const c = new Container()
 * c.set(ports.logger, { info: console.log })
 * c.resolve(ports.logger).info('hello')
 * ```
 */
export function createPortTokens<T extends Record<string, unknown>>(shape: T, namespace = 'ports'): TokensOf<T> {
	return createTokens(namespace, shape)
}

/** Extend an existing set of Port tokens with additional ports or create a new one (overload). */
export function extendPorts<Ext extends Record<string, unknown>>(ext: Ext): Readonly<TokensOf<Ext>>;
/** Extend a base token map with an extension shape (overload). */
export function extendPorts<Base extends Record<string, Token<unknown>>, Ext extends Record<string, unknown>>(base: Base, ext: Ext): Readonly<Base & TokensOf<Ext>>;
/**
 * Extend an existing token map or create a new one from a shape.
 *
 * - extendPorts(ext) creates a new token set from scratch.
 * - extendPorts(base, ext) merges into an existing token map (throws on duplicate keys).
 *
 * @param args - Either just the extension shape, or a base map and extension shape
 * @returns A frozen map combining tokens
 * @throws Error with code ORK1040 when duplicate keys are present in the extension shape
 *
 * @example
 * ```ts
 * const base = createPortTokens({ a: undefined as number })
 * const more = extendPorts(base, { b: undefined as string })
 * // more.a and more.b are tokens
 * ```
 */
export function extendPorts(
	...args: [Record<string, unknown>] | [Record<string, Token<unknown>>, Record<string, unknown>]
): unknown {
	if (args.length === 1) {
		const [ext] = args
		const newTokens = createTokens('ports', ext)
		return Object.freeze({ ...newTokens })
	}
	const [base, ext] = args
	for (const k of Object.keys(ext)) {
		if (k in base) {
			new DiagnosticAdapter({ logger: new NoopLogger(), messages: PORTS_MESSAGES }).fail('ORK1040', { scope: 'internal', message: `extendPorts: duplicate port key '${k}'` })
		}
	}
	const newTokens = createTokens('ports', ext)
	return Object.freeze({ ...base, ...newTokens })
}

/**
 * Create a single Port token with a stable description under the `ports:` namespace.
 *
 * @param name - Port name appended to the 'ports:' namespace for Symbol description.
 * @returns A Token<T> describing the named port.
 * @example Define a named port token and use it with a Container.
 * ```ts
 * const HttpPort = createPortToken<{ get(url: string): Promise<string> }>('http')
 * // container.set(HttpPort, impl)
 * ```
 */
export function createPortToken<T>(name: string): Token<T> {
	return createToken<T>(`ports:${name}`)
}
