[**@orkestrel/core**](../index.md)

***

# Interface: LayerPort

Defined in: [types.ts:215](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L215)

## Methods

### compute()

> **compute**\<`T`\>(`nodes`): [`Token`](../type-aliases/Token.md)\<`T`\>[][]

Defined in: [types.ts:216](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L216)

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

Defined in: [types.ts:217](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L217)

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
