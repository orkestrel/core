[**@orkestrel/core**](../index.md)

***

# Class: LayerAdapter

Defined in: [adapters/layer.ts:30](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/layer.ts#L30)

Topological layering adapter using Kahn's algorithm for dependency ordering.

Computes deterministic layers from a dependency graph in O(V+E) time. Each layer contains
tokens with no remaining dependencies on earlier layers. Validates that all dependencies
exist and detects cycles; preserves insertion order within each layer for determinism.

## Example

```ts
import { LayerAdapter, createToken } from '@orkestrel/core'
const A = createToken('A')
const B = createToken('B')
const C = createToken('C')
const layer = new LayerAdapter()
const nodes = [
  { token: A, dependencies: [] },
  { token: B, dependencies: [A] },
  { token: C, dependencies: [A, B] },
]
const layers = layer.compute(nodes)
// => [[A], [B, C]]
```

## Implements

- [`LayerPort`](../interfaces/LayerPort.md)

## Constructors

### Constructor

> **new LayerAdapter**(`options`): `LayerAdapter`

Defined in: [adapters/layer.ts:42](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/layer.ts#L42)

Construct a LayerAdapter with optional logger and diagnostic ports.

#### Parameters

##### options

[`LayerAdapterOptions`](../interfaces/LayerAdapterOptions.md) = `{}`

Configuration options:
- logger: Optional logger port for diagnostics
- diagnostic: Optional diagnostic port for validation errors
   *

#### Returns

`LayerAdapter`

## Accessors

### diagnostic

#### Get Signature

> **get** **diagnostic**(): [`DiagnosticPort`](../interfaces/DiagnosticPort.md)

Defined in: [adapters/layer.ts:59](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/layer.ts#L59)

Access the diagnostic port used by this layer adapter for validation errors and tracing.

##### Returns

[`DiagnosticPort`](../interfaces/DiagnosticPort.md)

The configured DiagnosticPort instance

***

### logger

#### Get Signature

> **get** **logger**(): [`LoggerPort`](../interfaces/LoggerPort.md)

Defined in: [adapters/layer.ts:52](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/layer.ts#L52)

Access the logger port used by this layer adapter.

##### Returns

[`LoggerPort`](../interfaces/LoggerPort.md)

The configured LoggerPort instance

## Methods

### compute()

> **compute**\<`T`\>(`nodes`): [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Defined in: [adapters/layer.ts:84](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/layer.ts#L84)

Compute topological layers for the given dependency graph using Kahn's algorithm.

Produces an array of layers where each layer contains tokens that have no remaining
dependencies on previous layers. Tokens within a layer are ordered by insertion order
in the input nodes array. Validates that all dependencies exist and detects cycles.

#### Type Parameters

##### T

`T`

Token value type

#### Parameters

##### nodes

readonly [`LayerNode`](../interfaces/LayerNode.md)\<`T`\>[]

Array of nodes, each with a token and its dependencies

#### Returns

[`Token`](../type-aliases/Token.md)\<`T`\>[][]

Array of layers, each layer is an array of tokens with no remaining dependencies

#### Throws

Error with code ORK1008 if a dependency references an unknown token

#### Throws

Error with code ORK1009 if a cycle is detected in the dependency graph

#### Example

```ts
const layers = layer.compute([
  { token: Database, dependencies: [] },
  { token: UserService, dependencies: [Database] },
  { token: ApiServer, dependencies: [UserService] },
])
// => [[Database], [UserService], [ApiServer]]
```

#### Implementation of

[`LayerPort`](../interfaces/LayerPort.md).[`compute`](../interfaces/LayerPort.md#compute)

***

### group()

> **group**\<`T`\>(`tokens`, `layers`): [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Defined in: [adapters/layer.ts:160](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/adapters/layer.ts#L160)

Group tokens by their layer index in reverse order (highest layer first).

Used for stop and destroy operations that need to process components in reverse
dependency order. Tokens are grouped by their layer index from the original layering,
then iterated in descending order so dependent components are processed before their
dependencies.

#### Type Parameters

##### T

`T`

Token value type

#### Parameters

##### tokens

readonly [`Token`](../type-aliases/Token.md)\<`T`\>[]

Tokens to group

##### layers

readonly readonly [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Layers as returned by compute()

#### Returns

[`Token`](../type-aliases/Token.md)\<`T`\>[][]

Groups of tokens ordered from highest layer to lowest; input order is preserved within groups

#### Example

```ts
const layers = [[A], [B], [C]]
const tokensToStop = [B, C]
const groups = layer.group(tokensToStop, layers)
// => [[C], [B]] (reverse order for safe teardown)
```

#### Implementation of

[`LayerPort`](../interfaces/LayerPort.md).[`group`](../interfaces/LayerPort.md#group)
