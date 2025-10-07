# Layer (Port + Adapter)

Compute deterministic topological layers over a dependency graph for parallelizable start/stop ordering.

## Purpose
- Derive start order from dependencies using Kahn’s algorithm (O(V+E)).
- Validate unknown dependencies and detect cycles early with clear diagnostics.
- Group tokens by reverse layer order for teardown/rollback batching.

## Contract
- Port: LayerPort
  - compute<T>(nodes: ReadonlyArray<LayerNode<T>>): Token<T>[][]
    - Validates all dependencies reference known tokens
    - Throws on cycles
  - group<T>(tokens: ReadonlyArray<Token<T>>, layers: ReadonlyArray<ReadonlyArray<Token<T>>>): Token<T>[][]
    - Groups provided tokens by their layer index in reverse (highest layer first)
- Types
  - LayerNode<T>: `{ token: Token<T>; dependencies: readonly Token<unknown>[] }`

## Default adapter
- LayerAdapter implements Kahn’s algorithm with deterministic ordering.
- Diagnostics
  - Unknown dependency → ORK1008 via diagnostics
  - Cycle detected → ORK1009 via diagnostics

## Usage
```ts
import { type LayerPort, LayerAdapter, type Token } from '@orkestrel/core'

// Define tokens (for illustration)
const A: Token<'A'> = Symbol('A') as any
const B: Token<'B'> = Symbol('B') as any
const C: Token<'C'> = Symbol('C') as any

const nodes = [
  { token: A, dependencies: [] },      // layer 0
  { token: B, dependencies: [A] },     // layer 1
  { token: C, dependencies: [A, B] },  // layer 2
]

const layerer: LayerPort = new LayerAdapter()
const layers = layerer.compute(nodes)
// layers: [[A], [B], [C]]

// Group a subset by reverse layer order (e.g., for stop/destroy)
const groups = layerer.group([A, B, C], layers)
// groups: [[C], [B], [A]]
```

## Notes
- Orchestrator uses LayerAdapter internally to compute start order, stop order (reverse), and destroy order (reverse).
- The adapter is environment-agnostic and works in Node and the browser.
