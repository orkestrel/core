[**@orkestrel/core**](../index.md)

***

# Interface: RegistryPort\<T\>

Defined in: [types.ts:329](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L329)

## Type Parameters

### T

`T`

## Methods

### clear()

> **clear**(`name?`, `force?`): `boolean`

Defined in: [types.ts:333](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L333)

#### Parameters

##### name?

`string` | `symbol`

##### force?

`boolean`

#### Returns

`boolean`

***

### get()

> **get**(`name?`): `T` \| `undefined`

Defined in: [types.ts:330](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L330)

#### Parameters

##### name?

`string` | `symbol`

#### Returns

`T` \| `undefined`

***

### list()

> **list**(): readonly (`string` \| `symbol`)[]

Defined in: [types.ts:334](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L334)

#### Returns

readonly (`string` \| `symbol`)[]

***

### resolve()

> **resolve**(`name?`): `T`

Defined in: [types.ts:331](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L331)

#### Parameters

##### name?

`string` | `symbol`

#### Returns

`T`

***

### set()

> **set**(`name`, `value`, `lock?`): `void`

Defined in: [types.ts:332](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L332)

#### Parameters

##### name

`string` | `symbol`

##### value

`T`

##### lock?

`boolean`

#### Returns

`void`
