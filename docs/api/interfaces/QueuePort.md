[**@orkestrel/core**](../index.md)

***

# Interface: QueuePort\<T\>

Defined in: [types.ts:198](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L198)

## Type Parameters

### T

`T` = `unknown`

## Methods

### dequeue()

> **dequeue**(): `Promise`\<`undefined` \| `T`\>

Defined in: [types.ts:200](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L200)

#### Returns

`Promise`\<`undefined` \| `T`\>

***

### enqueue()

> **enqueue**(`item`): `Promise`\<`void`\>

Defined in: [types.ts:199](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L199)

#### Parameters

##### item

`T`

#### Returns

`Promise`\<`void`\>

***

### run()

> **run**\<`R`\>(`tasks`, `options?`): `Promise`\<readonly `R`[]\>

Defined in: [types.ts:202](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L202)

#### Type Parameters

##### R

`R`

#### Parameters

##### tasks

readonly () => `R` \| `Promise`\<`R`\>[]

##### options?

[`QueueRunOptions`](QueueRunOptions.md)

#### Returns

`Promise`\<readonly `R`[]\>

***

### size()

> **size**(): `Promise`\<`number`\>

Defined in: [types.ts:201](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L201)

#### Returns

`Promise`\<`number`\>
