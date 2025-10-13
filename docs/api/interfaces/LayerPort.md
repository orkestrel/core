[**@orkestrel/core**](../index.md)

***

# Interface: LayerPort

Defined in: [types.ts:214](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L214)

## Methods

### compute()

> **compute**\<`T`\>(`nodes`): [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Defined in: [types.ts:215](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L215)

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

Defined in: [types.ts:216](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L216)

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
