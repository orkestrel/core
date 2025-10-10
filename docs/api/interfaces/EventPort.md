[**@orkestrel/core**](../index.md)

***

# Interface: EventPort\<EMap\>

Defined in: [types.ts:175](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L175)

## Type Parameters

### EMap

`EMap` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

## Methods

### publish()

> **publish**\<`E`\>(`topic`, `payload`): `Promise`\<`void`\>

Defined in: [types.ts:176](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L176)

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### topic

`E`

##### payload

`EMap`\[`E`\]

#### Returns

`Promise`\<`void`\>

***

### subscribe()

> **subscribe**\<`E`\>(`topic`, `handler`): `Promise`\<() => `void` \| `Promise`\<`void`\>\>

Defined in: [types.ts:177](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L177)

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### topic

`E`

##### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<`EMap`\[`E`\]\>

#### Returns

`Promise`\<() => `void` \| `Promise`\<`void`\>\>

***

### topics()

> **topics**(): readonly `string`[]

Defined in: [types.ts:178](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L178)

#### Returns

readonly `string`[]
