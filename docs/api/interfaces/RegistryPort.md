[**@orkestrel/core**](../index.md)

***

# Interface: RegistryPort\<T\>

Defined in: [types.ts:330](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L330)

## Type Parameters

### T

`T`

## Methods

### clear()

> **clear**(`name?`, `force?`): `boolean`

Defined in: [types.ts:334](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L334)

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

Defined in: [types.ts:331](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L331)

#### Parameters

##### name?

`string` | `symbol`

#### Returns

`undefined` \| `T`

***

### list()

> **list**(): readonly (`string` \| `symbol`)[]

Defined in: [types.ts:335](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L335)

#### Returns

readonly (`string` \| `symbol`)[]

***

### resolve()

> **resolve**(`name?`): `T`

Defined in: [types.ts:332](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L332)

#### Parameters

##### name?

`string` | `symbol`

#### Returns

`T`

***

### set()

> **set**(`name`, `value`, `lock?`): `void`

Defined in: [types.ts:333](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L333)

#### Parameters

##### name

`string` | `symbol`

##### value

`T`

##### lock?

`boolean`

#### Returns

`void`
