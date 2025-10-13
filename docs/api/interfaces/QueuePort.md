[**@orkestrel/core**](../index.md)

***

# Interface: QueuePort\<T\>

Defined in: [types.ts:197](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L197)

## Type Parameters

### T

`T` = `unknown`

## Methods

### dequeue()

> **dequeue**(): `Promise`\<`T` \| `undefined`\>

Defined in: [types.ts:199](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L199)

#### Returns

`Promise`\<`T` \| `undefined`\>

***

### enqueue()

> **enqueue**(`item`): `Promise`\<`void`\>

Defined in: [types.ts:198](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L198)

#### Parameters

##### item

`T`

#### Returns

`Promise`\<`void`\>

***

### run()

> **run**\<`R`\>(`tasks`, `options?`): `Promise`\<readonly `R`[]\>

Defined in: [types.ts:201](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L201)

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

Defined in: [types.ts:200](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L200)

#### Returns

`Promise`\<`number`\>
