[**@orkestrel/core**](../index.md)

***

# Interface: OrchestratorRegistration\<T\>

Defined in: [types.ts:287](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L287)

## Type Parameters

### T

`T`

## Properties

### dependencies?

> `readonly` `optional` **dependencies**: readonly [`Token`](../type-aliases/Token.md)\<`unknown`\>[]

Defined in: [types.ts:290](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L290)

***

### provider

> `readonly` **provider**: [`Provider`](../type-aliases/Provider.md)\<`T`\>

Defined in: [types.ts:289](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L289)

***

### timeouts?

> `readonly` `optional` **timeouts**: `number` \| `Readonly`\<\{ `onDestroy?`: `number`; `onStart?`: `number`; `onStop?`: `number`; \}\>

Defined in: [types.ts:291](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L291)

***

### token

> `readonly` **token**: [`Token`](../type-aliases/Token.md)\<`T`\>

Defined in: [types.ts:288](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L288)
