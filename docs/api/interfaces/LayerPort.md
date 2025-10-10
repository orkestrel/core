[**@orkestrel/core**](../index.md)

***

# Interface: LayerPort

Defined in: [types.ts:215](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L215)

## Methods

### compute()

> **compute**\<`T`\>(`nodes`): [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Defined in: [types.ts:216](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L216)

#### Type Parameters

##### T

`T`

#### Parameters

##### nodes

readonly [`LayerNode`](LayerNode.md)\<`T`\>[]

#### Returns

[`Token`](../type-aliases/Token.md)\<`T`\>[][]

***

### group()

> **group**\<`T`\>(`tokens`, `layers`): [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Defined in: [types.ts:217](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L217)

#### Type Parameters

##### T

`T`

#### Parameters

##### tokens

readonly [`Token`](../type-aliases/Token.md)\<`T`\>[]

##### layers

readonly readonly [`Token`](../type-aliases/Token.md)\<`T`\>[][]

#### Returns

[`Token`](../type-aliases/Token.md)\<`T`\>[][]
