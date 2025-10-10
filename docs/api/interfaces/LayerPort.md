[**@orkestrel/core**](../index.md)

***

# Interface: LayerPort

Defined in: [types.ts:215](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L215)

## Methods

### compute()

> **compute**\<`T`\>(`nodes`): [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Defined in: [types.ts:216](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L216)

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

Defined in: [types.ts:217](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L217)

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
