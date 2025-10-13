[**@orkestrel/core**](../index.md)

***

# Interface: EmitterPort\<EMap\>

Defined in: [types.ts:163](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L163)

## Type Parameters

### EMap

`EMap` *extends* [`EventMap`](../type-aliases/EventMap.md) = [`EventMap`](../type-aliases/EventMap.md)

## Methods

### emit()

> **emit**\<`E`\>(`event`, ...`args`): `void`

Defined in: [types.ts:166](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L166)

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

Defined in: [types.ts:165](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L165)

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

Defined in: [types.ts:164](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L164)

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

Defined in: [types.ts:167](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L167)

#### Returns

`void`
