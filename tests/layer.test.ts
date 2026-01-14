import { describe, test, assert } from 'vitest'
import { LayerAdapter, createToken, tokenDescription, NoopLogger } from '@orkestrel/core'

const logger = new NoopLogger()

const A = createToken('A')
const B = createToken('B')
const C = createToken('C')
const D = createToken('D')

function nodes() {
	return [
		{ token: A, dependencies: [] },
		{ token: B, dependencies: [A] },
		{ token: C, dependencies: [A] },
		{ token: D, dependencies: [B, C] },
	] as const
}

// Tiny seeded PRNG (LCG) and random DAG generator for property checks
function makeRng(seed: number) {
	let s = seed >>> 0
	return {
		nextU32() {
			s = (s * 1664525 + 1013904223) >>> 0
			return s
		},
		next() { return (this.nextU32() & 0xffffffff) / 0x100000000 },
		rangeInt(min: number, max: number) {
			const r = this.next()
			return Math.floor(min + r * (max - min + 1))
		},
		chance(p: number) { return this.next() < p },
		shuffle<T>(arr: T[]): T[] {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = this.rangeInt(0, i)
				const t = arr[i]
				arr[i] = arr[j]
				arr[j] = t
			}
			return arr
		},
	}
}

function buildRandomDag(rng: ReturnType<typeof makeRng>) {
	const n = rng.rangeInt(3, 8)
	const nodes = Array.from({ length: n }, (_, i) => i)
	const edges: [number, number][] = []
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			if (rng.chance(0.3)) edges.push([i, j])
		}
	}
	const labels = rng.shuffle(nodes.slice())
	return { n, edges, labels }
}

describe('Layer suite', () => {
	test('compute returns deterministic topological layers (Kahn)', () => {
		const layer = new LayerAdapter({ logger })
		const layers = layer.compute(nodes())
		assert.deepEqual(layers, [[A], [B, C], [D]])
	})

	test('compute throws ORK1008 on unknown dependency', () => {
		const layer = new LayerAdapter({ logger })
		const UNKNOWN = createToken('UNKNOWN')
		assert.throws(() => {
			layer.compute([
				{ token: A, dependencies: [UNKNOWN] },
			])
		}, (err: unknown) => {
			const e = err as { message?: string; code?: string }
			return e?.code === 'ORK1008' && typeof e?.message === 'string' && e.message.includes('Unknown dependency')
		})
	})

	test('compute throws ORK1009 when cycle exists', () => {
		const layer = new LayerAdapter({ logger })
		assert.throws(() => {
			// A <- B <- A (cycle)
			layer.compute([
				{ token: A, dependencies: [B] },
				{ token: B, dependencies: [A] },
			])
		}, (err: unknown) => {
			const e = err as { message?: string; code?: string }
			return e?.code === 'ORK1009' && typeof e?.message === 'string' && /cycle/i.test(e.message)
		})
	})

	test('group returns tokens grouped by reverse layer order', () => {
		const layer = new LayerAdapter({ logger })
		const layers = layer.compute(nodes())
		const groups = layer.group([D, B], layers)
		assert.deepEqual(groups, [[D], [B]])
	})

	test('group ignores tokens not present in layers', () => {
		const layer = new LayerAdapter({ logger })
		const layers = layer.compute(nodes())
		const X = createToken('X')
		const groups = layer.group([X, D], layers)
		assert.deepEqual(groups, [[D]])
	})

	test('tokenDescription formats symbols', () => {
		assert.equal(tokenDescription(A), 'A')
	})

	test('property: random DAG layering respects edges', () => {
		const seeds = [1, 2, 3, 123456, 987654321]
		for (const seed of seeds) {
			const rng = makeRng(seed)
			for (let iter = 0; iter < 5; iter++) {
				const { n, edges, labels } = buildRandomDag(rng)
				const tokens = Array.from({ length: n }, (_, i) => createToken(`N${labels[i]}`))
				const nodes = tokens.map((tk, i) => ({ token: tk, dependencies: edges.filter(([_, v]) => v === i).map(([u]) => tokens[u]) }))
				const layer = new LayerAdapter({ logger })
				const layers = layer.compute(nodes)
				const index = new Map<symbol, number>()
				layers.forEach((layerArr, idx) => layerArr.forEach(tk => index.set(tk, idx)))
				for (const [u, v] of edges) {
					const iu = index.get(tokens[u])
					const iv = index.get(tokens[v])
					assert.ok(iu !== undefined && iv !== undefined, `index missing for edge ${u}->${v}`)
					assert.ok(iu < iv, `topology violated for edge ${u}->${v}: ${iu} !< ${iv}`)
				}
			}
		}
	})

	test('property: reverse grouping respects edge direction for stop/destroy', () => {
		const seeds = [11, 22, 333, 4444]
		for (const seed of seeds) {
			const rng = makeRng(seed)
			for (let iter = 0; iter < 5; iter++) {
				const { n, edges, labels } = buildRandomDag(rng)
				const tokens = Array.from({ length: n }, (_, i) => createToken(`M${labels[i]}`))
				const nodes = tokens.map((tk, i) => ({ token: tk, dependencies: edges.filter(([_, v]) => v === i).map(([u]) => tokens[u]) }))
				const layer = new LayerAdapter({ logger })
				const layers = layer.compute(nodes)
				const groups = layer.group(tokens, layers)
				// Build an order index for reverse groups: lower group index means later in stop/destroy order
				const order = new Map<symbol, number>()
				groups.forEach((g, idx) => g.forEach(tk => order.set(tk, idx)))
				for (const [u, v] of edges) {
					const ou = order.get(tokens[u])
					const ov = order.get(tokens[v])
					assert.ok(ou !== undefined && ov !== undefined, `order missing for edge ${u}->${v}`)
					assert.ok(ov < ou, `reverse order violated for edge ${u}->${v}: ${ov} !< ${ou}`)
				}
			}
		}
	})
})
