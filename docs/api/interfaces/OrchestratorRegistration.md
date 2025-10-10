[**@orkestrel/core**](../index.md)

***

# Interface: OrchestratorRegistration\<T\>

Defined in: [types.ts:288](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L288)

## Type Parameters

### T

`T`

## Properties

### dependencies?

> `readonly` `optional` **dependencies**: readonly [`Token`](../type-aliases/Token.md)\<`unknown`\>[]

Defined in: [types.ts:291](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L291)

***

### provider

> `readonly` **provider**: [`Provider`](../type-aliases/Provider.md)\<`T`\>

Defined in: [types.ts:290](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L290)

***

### timeouts?

> `readonly` `optional` **timeouts**: `number` \| `Readonly`\<\{ `onDestroy?`: `number`; `onStart?`: `number`; `onStop?`: `number`; \}\>

Defined in: [types.ts:292](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L292)

***

### token

> `readonly` **token**: [`Token`](../type-aliases/Token.md)\<`T`\>

Defined in: [types.ts:289](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L289)
