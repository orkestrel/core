import type { Token, LayerNode, LayerPort, LayerAdapterOptions, DiagnosticPort, LoggerPort } from '../types.js'
import { tokenDescription } from '../helpers.js'
import { DiagnosticAdapter } from './diagnostic.js'
import { LoggerAdapter } from './logger.js'
import { HELP, ORCHESTRATOR_MESSAGES } from '../constants.js'

/**
 * In-memory adapter for topological layering using Kahn's algorithm.
 * Provides deterministic O(V+E) layering with strict dependency validation.
 *
 * Example
 * -------
 * ```ts
 * const layer = new LayerAdapter()
 * const nodes = [
 *   { token: A, dependencies: [] },
 *   { token: B, dependencies: [A] },
 * ]
 * const layers = layer.compute(nodes) // [[A], [B]]
 * ```
 *
 * @throws ORK1008 if a dependency references an unknown token
 * @throws ORK1009 if a cycle is detected in the dependency graph
 */
export class LayerAdapter implements LayerPort {
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 *
	 * @param options
	 * @returns -
	 * @example
	 */
	constructor(options: LayerAdapterOptions = {}) {
		this.#logger = options.logger ?? new LoggerAdapter()
		this.#diagnostic = options.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: ORCHESTRATOR_MESSAGES })
	}

	/** Logger backing this adapter. */
	get logger(): LoggerPort { return this.#logger }

	/** Diagnostic port used for validation errors and tracing. */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/**
     * Compute topological layers for the given nodes using Kahn's algorithm.
     * @param nodes
     * @returns Array of layers, where each layer contains tokens with no remaining dependencies.
     * @throws ORK1008 if a dependency references an unknown token
     * @throws ORK1009 if a cycle is detected in the dependency graph
	 * @example
     */
	compute<T>(nodes: ReadonlyArray<LayerNode<T>>): Token<T>[][] {
		// Validate dependencies exist
		const present = new Set<symbol>(nodes.map(n => n.token))
		for (const n of nodes) {
			for (const d of n.dependencies) {
				if (!present.has(d)) {
					this.#diagnostic.fail('ORK1008', {
						scope: 'orchestrator',
						message: `Unknown dependency ${tokenDescription(d)} required by ${tokenDescription(n.token)}`,
						helpUrl: HELP.orchestrator,
						token: tokenDescription(n.token),
					})
				}
			}
		}

		// Build typed map for tokens and adjacency keyed by symbol identity
		const typed = new Map<symbol, Token<T>>()
		for (const n of nodes) typed.set(n.token, n.token)

		const indeg = new Map<symbol, number>()
		const adj = new Map<symbol, symbol[]>()
		for (const n of nodes) {
			indeg.set(n.token, 0)
			adj.set(n.token, [])
		}
		for (const n of nodes) {
			for (const d of n.dependencies) {
				indeg.set(n.token, (indeg.get(n.token) ?? 0) + 1)
				const arr = adj.get(d)
				if (arr) arr.push(n.token)
			}
		}

		// Initial frontier in insertion order
		let frontierSyms: symbol[] = nodes
			.filter(n => (indeg.get(n.token) ?? 0) === 0)
			.map(n => n.token)

		const layers: Token<T>[][] = []
		while (frontierSyms.length) {
			const layerTokens = frontierSyms.map(s => typed.get(s)).filter((t): t is Token<T> => t !== undefined)
			layers.push(layerTokens)
			const next: symbol[] = []
			for (const s of frontierSyms) {
				const dependents = adj.get(s)
				if (!dependents) continue
				for (const dep of dependents) {
					const v = (indeg.get(dep) ?? 0) - 1
					indeg.set(dep, v)
					if (v === 0) next.push(dep)
				}
			}
			frontierSyms = next
		}

		// Check for cycles
		const totalResolved = layers.reduce((a, b) => a + b.length, 0)
		if (totalResolved !== nodes.length) {
			this.#diagnostic.fail('ORK1009', { scope: 'orchestrator', message: 'Cycle detected in dependency graph', helpUrl: HELP.orchestrator })
		}

		return layers
	}

	/**
     * Group tokens by their layer order in reverse (highest layer first).
     * Used for stop/destroy operations that need to process in reverse dependency order.
     * @param tokens
     * @param layers
     * @returns -
	 * @example
     */
	group<T>(tokens: ReadonlyArray<Token<T>>, layers: ReadonlyArray<ReadonlyArray<Token<T>>>): Token<T>[][] {
		const layerIndex = new Map<Token<T>, number>()
		layers.forEach((layer, idx) => layer.forEach(tk => layerIndex.set(tk, idx)))

		const groups = new Map<number, Token<T>[]>()
		for (const tk of tokens) {
			const idx = layerIndex.get(tk)
			if (idx === undefined) continue
			const arr = groups.get(idx) ?? []
			arr.push(tk)
			groups.set(idx, arr)
		}

		return Array.from(groups.entries())
			.sort((a, b) => b[0] - a[0])
			.map(([, arr]) => arr)
	}
}
