import type { Token, LayerNode, LayerPort } from '../types.js'
import { D, tokenDescription } from '../diagnostics.js'

/**
 * In-memory adapter for topological layering using Kahn's algorithm.
 * Provides deterministic O(V+E) layering with strict dependency validation.
 */
export class LayerAdapter implements LayerPort {
	/**
     * Compute topological layers for the given nodes using Kahn's algorithm.
     * @returns Array of layers, where each layer contains tokens with no remaining dependencies.
     * @throws ORK1008 if a dependency references an unknown token
     * @throws ORK1009 if a cycle is detected in the dependency graph
     */
	compute<T>(nodes: ReadonlyArray<LayerNode<T>>): Token<T>[][] {
		// Validate dependencies exist
		const present = new Set<Token<unknown>>(nodes.map(n => n.token))
		for (const n of nodes) {
			for (const d of n.dependencies) {
				if (!present.has(d)) {
					throw D.unknownDependency(tokenDescription(d), tokenDescription(n.token))
				}
			}
		}

		// Build indegree and adjacency (dependents) preserving insertion order
		const indeg = new Map<Token<T>, number>()
		const adj = new Map<Token<T>, Token<T>[]>()
		for (const n of nodes) {
			indeg.set(n.token as Token<T>, 0)
			adj.set(n.token as Token<T>, [])
		}
		for (const n of nodes) {
			for (const d of n.dependencies) {
				indeg.set(n.token as Token<T>, (indeg.get(n.token as Token<T>) ?? 0) + 1)
				adj.get(d as Token<T>)!.push(n.token as Token<T>)
			}
		}

		// Initial frontier in insertion order
		let frontier: Token<T>[] = nodes
			.filter(n => (indeg.get(n.token as Token<T>) ?? 0) === 0)
			.map(n => n.token as Token<T>)

		const layers: Token<T>[][] = []
		while (frontier.length) {
			layers.push(frontier)
			const next: Token<T>[] = []
			for (const tk of frontier) {
				const dependents = adj.get(tk)
				if (!dependents) continue
				for (const dep of dependents) {
					const v = (indeg.get(dep) ?? 0) - 1
					indeg.set(dep, v)
					if (v === 0) next.push(dep)
				}
			}
			frontier = next
		}

		// Check for cycles
		const totalResolved = layers.reduce((a, b) => a + b.length, 0)
		if (totalResolved !== nodes.length) {
			throw D.cycleDetected()
		}

		return layers
	}

	/**
     * Group tokens by their layer order in reverse (highest layer first).
     * Used for stop/destroy operations that need to process in reverse dependency order.
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
