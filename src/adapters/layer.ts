import type { Token, LayerNode, LayerPort, LayerAdapterOptions, DiagnosticPort, LoggerPort } from '../types.js';
import { tokenDescription } from '../helpers.js';
import { DiagnosticAdapter } from './diagnostic.js';
import { LoggerAdapter } from './logger.js';
import { HELP, ORCHESTRATOR_MESSAGES } from '../constants.js';

/**
 * Topological layering adapter using Kahn's algorithm for dependency ordering.
 *
 * Computes deterministic layers from a dependency graph in O(V+E) time. Each layer contains
 * tokens with no remaining dependencies on earlier layers. Validates that all dependencies
 * exist and detects cycles; preserves insertion order within each layer for determinism.
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
 * // => [[A], [B, C]]
 * ```
 */
export class LayerAdapter implements LayerPort {
	readonly #logger: LoggerPort;
	readonly #diagnostic: DiagnosticPort;

	/**
	 * Construct a LayerAdapter with optional logger and diagnostic ports.
	 *
	 * @param options - Configuration options:
	 * - logger: Optional logger port for diagnostics
	 * - diagnostic: Optional diagnostic port for validation errors
     *
     */
	constructor(options: LayerAdapterOptions = {}) {
		this.#logger = options.logger ?? new LoggerAdapter();
		this.#diagnostic = options.diagnostic ?? new DiagnosticAdapter({ logger: this.#logger, messages: ORCHESTRATOR_MESSAGES });
	}

	/**
	 * Access the logger port used by this layer adapter.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger; }

	/**
	 * Access the diagnostic port used by this layer adapter for validation errors and tracing.
	 *
	 * @returns The configured DiagnosticPort instance
	 */
	get diagnostic(): DiagnosticPort { return this.#diagnostic; }

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
	compute<T>(nodes: ReadonlyArray<LayerNode<T>>): Array<Array<Token<T>>> {
		// Validate dependencies exist
		const present = new Set<symbol>();
		for (const n of nodes) present.add(n.token);
		for (const n of nodes) {
			for (const d of n.dependencies) {
				if (!present.has(d)) {
					this.#diagnostic.fail('ORK1008', { scope: 'orchestrator', message: `Unknown dependency ${tokenDescription(d)} required by ${tokenDescription(n.token)}`, helpUrl: HELP.orchestrator, token: tokenDescription(n.token) });
				}
			}
		}

		// Build graph keyed by symbol identity
		const typed = new Map<symbol, Token<T>>();
		const indeg = new Map<symbol, number>();
		const adj = new Map<symbol, symbol[]>();
		for (const n of nodes) {
			typed.set(n.token, n.token);
			indeg.set(n.token, 0);
			adj.set(n.token, []);
		}
		for (const n of nodes) {
			for (const dep of n.dependencies) {
				indeg.set(n.token, (indeg.get(n.token) ?? 0) + 1);
				const arr = adj.get(dep);
				if (arr) arr.push(n.token);
			}
		}

		// Kahn frontier in insertion order
		let frontier: symbol[] = [];
		for (const n of nodes) if ((indeg.get(n.token) ?? 0) === 0) frontier.push(n.token);
		const layers: Array<Array<Token<T>>> = [];
		let resolved = 0;
		while (frontier.length) {
			const current = frontier;
			frontier = [];
			const layer: Array<Token<T>> = [];
			for (const s of current) {
				const tk = typed.get(s);
				if (tk) layer.push(tk);
				for (const child of adj.get(s) ?? []) {
					const v = (indeg.get(child) ?? 0) - 1;
					indeg.set(child, v);
					if (v === 0) frontier.push(child);
				}
				resolved++;
			}
			layers.push(layer);
		}

		if (resolved !== nodes.length) this.#diagnostic.fail('ORK1009', { scope: 'orchestrator', message: 'Cycle detected in dependency graph', helpUrl: HELP.orchestrator });
		return layers;
	}

	/**
	 * Group tokens by their layer index in reverse order (highest layer first).
	 *
	 * Used for stop and destroy operations that need to process components in reverse
	 * dependency order. Tokens are grouped by their layer index from the original layering,
	 * then iterated in descending order so dependent components are processed before their
	 * dependencies.
	 *
	 * @typeParam T - Token value type
	 * @param tokens - Tokens to group
	 * @param layers - Layers as returned by compute()
	 * @returns Groups of tokens ordered from highest layer to lowest; input order is preserved within groups
	 *
	 * @example
	 * ```ts
	 * const layers = [[A], [B], [C]]
	 * const tokensToStop = [B, C]
	 * const groups = layer.group(tokensToStop, layers)
	 * // => [[C], [B]] (reverse order for safe teardown)
	 * ```
	 */
	group<T>(tokens: ReadonlyArray<Token<T>>, layers: ReadonlyArray<ReadonlyArray<Token<T>>>): Array<Array<Token<T>>> {
		// Build index of token -> layer number
		const index = new Map<symbol, number>();
		for (let i = 0; i < layers.length; i++) for (const tk of layers[i]) index.set(tk, i);
		// Bucket tokens by their layer, preserving input order per bucket
		const buckets = new Map<number, Array<Token<T>>>();
		for (const tk of tokens) {
			const idx = index.get(tk);
			if (idx == null) continue;
			let list = buckets.get(idx);
			if (!list) {
				list = [];
				buckets.set(idx, list);
			}
			list.push(tk);
		}
		// Emit in strict reverse layer order without sorting keys
		const out: Array<Array<Token<T>>> = [];
		for (let i = layers.length - 1; i >= 0; i--) {
			const g = buckets.get(i);
			if (g?.length) out.push(g);
		}
		return out;
	}
}
