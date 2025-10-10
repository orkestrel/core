[**@orkestrel/core**](../index.md)

***

# Interface: EmitterPort\<EMap\>

Defined in: [types.ts:164](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L164)

## Type Parameters

### EMap

`EMap` *extends* [`EventMap`](../type-aliases/EventMap.md) = [`EventMap`](../type-aliases/EventMap.md)

## Methods

### emit()

> **emit**\<`E`\>(`event`, ...`args`): `void`

Defined in: [types.ts:167](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L167)

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### event

`E`

##### args

...`EMap`\[`E`\]

#### Returns

`void`

***

### off()

> **off**\<`E`\>(`event`, `fn`): `this`

Defined in: [types.ts:166](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L166)

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### event

`E`

##### fn

[`EmitterListener`](../type-aliases/EmitterListener.md)\<`EMap`, `E`\>

#### Returns

`this`

***

### on()

> **on**\<`E`\>(`event`, `fn`): `this`

Defined in: [types.ts:165](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L165)

#### Type Parameters

##### E

`E` *extends* `string`

#### Parameters

##### event

`E`

##### fn

[`EmitterListener`](../type-aliases/EmitterListener.md)\<`EMap`, `E`\>

#### Returns

`this`

***

### removeAllListeners()

> **removeAllListeners**(): `void`

Defined in: [types.ts:168](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L168)

#### Returns

`void`
