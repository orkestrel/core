[**@orkestrel/core**](../index.md)

***

# Interface: RegistryPort\<T\>

Defined in: [types.ts:329](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L329)

## Type Parameters

### T

`T`

## Methods

### clear()

> **clear**(`name?`, `force?`): `boolean`

Defined in: [types.ts:333](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L333)

#### Parameters

##### name?

`string` | `symbol`

##### force?

`boolean`

#### Returns

`boolean`

***

### get()

> **get**(`name?`): `undefined` \| `T`

Defined in: [types.ts:330](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L330)

#### Parameters

##### name?

`string` | `symbol`

#### Returns

`undefined` \| `T`

***

### list()

> **list**(): readonly (`string` \| `symbol`)[]

Defined in: [types.ts:334](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L334)

#### Returns

readonly (`string` \| `symbol`)[]

***

### resolve()

> **resolve**(`name?`): `T`

Defined in: [types.ts:331](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L331)

#### Parameters

##### name?

`string` | `symbol`

#### Returns

`T`

***

### set()

> **set**(`name`, `value`, `lock?`): `void`

Defined in: [types.ts:332](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L332)

#### Parameters

##### name

`string` | `symbol`

##### value

`T`

##### lock?

`boolean`

#### Returns

`void`
