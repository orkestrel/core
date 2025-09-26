import type { Token } from './container.js'
import { createTokens } from './container.js'

// Generic helpers to define and extend Port token sets without hard-coding any specific ports.
// Users define their own Port interfaces in @orkestrel/adapters (or app code) and build tokens here.

// Create a set of tokens for a given shape. Namespace defaults to 'ports'.
export function createPortTokens<T extends Record<string, unknown>>(shape: T, namespace = 'ports'): { [K in keyof T]: Token<T[K]> } {
	return createTokens(namespace, shape as Record<string, unknown>) as { [K in keyof T]: Token<T[K]> }
}

// Extend an existing token set (or create a new one if passed a single argument).
export function extendPorts<Ext extends Record<string, unknown>>(ext: Ext): { [K in keyof Ext]: Token<Ext[K]> }
export function extendPorts<Base extends Record<string, Token<unknown>>, Ext extends Record<string, unknown>>(base: Base, ext: Ext): Base & { [K in keyof Ext]: Token<Ext[K]> }
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

// Convenience helper for a single token with a stable description
export function createPortToken<T>(name: string): Token<T> {
	return createTokens('ports', { [name]: {} as T })[name]
}
