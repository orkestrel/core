import type { Token, LayerNode, LayerPort, LayerAdapterOptions, DiagnosticPort, LoggerPort } from '../types.js'
import { tokenDescription } from '../helpers.js'
import { DiagnosticAdapter } from './diagnostic.js'
import { LoggerAdapter } from './logger.js'
import { HELP, ORCHESTRATOR_MESSAGES } from '../constants.js'

/**
 * Topological layering adapter using Kahn's algorithm for dependency ordering.
 *
 * Computes deterministic layers from a dependency graph in O(V+E) time. Each layer contains
 * nodes with no remaining dependencies on earlier layers. Validates that all dependencies
 * exist and detects cycles in the graph. Preserves insertion order within each layer for
 * determinism.
 *
 * @example
 * ```ts
 * import { LayerAdapter, createToken } from '@orkestrel/core'
 * const A = createToken('A')
 * const B = createToken('B')
 * const C = createToken('C')
 * const layer = new LayerAdapter()
 * const nodes = [
 *   { token: A, dependencies: [] },
 *   { token: B, dependencies: [A] },
 *   { token: C, dependencies: [A, B] },
 * ]
 * const layers = layer.compute(nodes)
 * // => [[A], [B], [C]]
 * ```
 *
 * @remarks
 * Throws ORK1008 if a dependency references an unknown token.
 * Throws ORK1009 if a cycle is detected in the dependency graph.
 */
export class LayerAdapter implements LayerPort {
	readonly #logger: LoggerPort
	readonly #diagnostic: DiagnosticPort

	/**
	 * Construct a LayerAdapter with optional logger and diagnostic ports.
	 *
	 * @param options - Configuration options
	 * @param options.logger - Optional logger port for diagnostics
	 * @param options.diagnostic - Optional diagnostic port for validation errors
	 *
	 * @example
	 * ```ts
	 * const layer = new LayerAdapter({ logger: customLogger })
	 * ```
	 */
	constructor(options: LayerAdapterOptions = {}) {
		this.#logger = options.logger ?? new LoggerAdapter()
		this.#diagnostic = options.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: ORCHESTRATOR_MESSAGES })
	}

	/**
	 * Access the logger port used by this layer adapter.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 * Access the diagnostic port used by this layer adapter for validation errors and tracing.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic }

	/**
	 * Compute topological layers for the given dependency graph using Kahn's algorithm.
	 *
	 * Produces an array of layers where each layer contains tokens that have no remaining
	 * dependencies on previous layers. Tokens within a layer are ordered by insertion order
	 * in the input nodes array. Validates that all dependencies exist and detects cycles.
	 *
	 * @typeParam T - Token value type
	 * @param nodes - Array of nodes, each with a token and its dependencies
	 * @returns Array of layers, each layer is an array of tokens with no remaining dependencies
	 * @throws Error with code ORK1008 if a dependency references an unknown token
	 * @throws Error with code ORK1009 if a cycle is detected in the dependency graph
	 *
	 * @example
	 * ```ts
	 * const layers = layer.compute([
	 *   { token: Database, dependencies: [] },
	 *   { token: UserService, dependencies: [Database] },
	 *   { token: ApiServer, dependencies: [UserService] },
	 * ])
	 * // => [[Database], [UserService], [ApiServer]]
	 * ```
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
	 * Group tokens by their layer index in reverse order (highest layer first).
	 *
	 * Used for stop and destroy operations that need to process components in reverse
	 * dependency order. Tokens are grouped by their layer index from the original layering,
	 * then sorted in descending order so dependent components are processed before their
	 * dependencies.
	 *
	 * @typeParam T - Token value type
	 * @param tokens - Array of tokens to group
	 * @param layers - Original forward layers computed by `compute()`
	 * @returns Array of token groups in reverse layer order
	 *
	 * @example
	 * ```ts
	 * const layers = [[A], [B], [C]]
	 * const tokensToStop = [B, C]
	 * const groups = layer.group(tokensToStop, layers)
	 * // => [[C], [B]] (reverse order for safe teardown)
	 * ```
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
