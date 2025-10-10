[**@orkestrel/core**](../index.md)

***

# Type Alias: ContainerGetter()

> **ContainerGetter** = [`Container`](../classes/Container.md)

Defined in: [types.ts:253](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L253)

> **ContainerGetter**(`name?`): [`Container`](../classes/Container.md)

Defined in: [types.ts:254](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L254)

## Parameters

### name?

`string` | `symbol`

## Returns

[`Container`](../classes/Container.md)

## Methods

### clear()

> **clear**(`name`, `force?`): `boolean`

Defined in: [types.ts:256](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L256)

#### Parameters

##### name

`string` | `symbol`

##### force?

`boolean`

#### Returns

`boolean`

***

### get()

#### Call Signature

> **get**\<`T`\>(`token`, `name?`): `undefined` \| `T`

Defined in: [types.ts:262](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L262)

##### Type Parameters

###### T

`T`

##### Parameters

###### token

[`Token`](Token.md)\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`undefined` \| `T`

#### Call Signature

> **get**\<`TMap`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: TMap\[K\] extends Token\<U\> ? undefined \| U : never \}

Defined in: [types.ts:263](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L263)

##### Type Parameters

###### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)

##### Parameters

###### tokens

`TMap`

###### name?

`string` | `symbol`

##### Returns

\{ \[K in string \| number \| symbol\]: TMap\[K\] extends Token\<U\> ? undefined \| U : never \}

#### Call Signature

> **get**\<`O`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: undefined \| O\[K\] \}

Defined in: [types.ts:264](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L264)

##### Type Parameters

###### O

`O` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### tokens

[`InjectObject`](InjectObject.md)\<`O`\>

###### name?

`string` | `symbol`

##### Returns

\{ \[K in string \| number \| symbol\]: undefined \| O\[K\] \}

#### Call Signature

> **get**\<`A`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: undefined \| A\[K\<K\>\] \}

Defined in: [types.ts:265](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L265)

##### Type Parameters

###### A

`A` *extends* readonly `unknown`[]

##### Parameters

###### tokens

[`InjectTuple`](InjectTuple.md)\<`A`\>

###### name?

`string` | `symbol`

##### Returns

\{ \[K in string \| number \| symbol\]: undefined \| A\[K\<K\>\] \}

***

### list()

> **list**(): (`string` \| `symbol`)[]

Defined in: [types.ts:257](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L257)

#### Returns

(`string` \| `symbol`)[]

***

### resolve()

#### Call Signature

> **resolve**\<`T`\>(`token`, `name?`): `T`

Defined in: [types.ts:258](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L258)

##### Type Parameters

###### T

`T`

##### Parameters

###### token

[`Token`](Token.md)\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`T`

#### Call Signature

> **resolve**\<`TMap`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: TMap\[K\] extends Token\<U\> ? U : never \}

Defined in: [types.ts:259](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L259)

##### Type Parameters

###### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)

##### Parameters

###### tokens

`TMap`

###### name?

`string` | `symbol`

##### Returns

\{ \[K in string \| number \| symbol\]: TMap\[K\] extends Token\<U\> ? U : never \}

#### Call Signature

> **resolve**\<`O`\>(`tokens`, `name?`): `O`

Defined in: [types.ts:260](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L260)

##### Type Parameters

###### O

`O` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### tokens

[`InjectObject`](InjectObject.md)\<`O`\>

###### name?

`string` | `symbol`

##### Returns

`O`

#### Call Signature

> **resolve**\<`A`\>(`tokens`, `name?`): `A`

Defined in: [types.ts:261](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L261)

##### Type Parameters

###### A

`A` *extends* readonly `unknown`[]

##### Parameters

###### tokens

[`InjectTuple`](InjectTuple.md)\<`A`\>

###### name?

`string` | `symbol`

##### Returns

`A`

***

### set()

> **set**(`name`, `c`, `lock?`): `void`

Defined in: [types.ts:255](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L255)

#### Parameters

##### name

`string` | `symbol`

##### c

[`Container`](../classes/Container.md)

##### lock?

`boolean`

#### Returns

`void`

***

### using()

#### Call Signature

> **using**(`fn`, `name?`): `Promise`\<`void`\>

Defined in: [types.ts:266](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L266)

##### Parameters

###### fn

(`c`) => `void` \| `Promise`\<`void`\>

###### name?

`string` | `symbol`

##### Returns

`Promise`\<`void`\>

#### Call Signature

> **using**\<`T`\>(`fn`, `name?`): `Promise`\<`T`\>

Defined in: [types.ts:267](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L267)

##### Type Parameters

###### T

`T`

##### Parameters

###### fn

(`c`) => `T` \| `Promise`\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`Promise`\<`T`\>

#### Call Signature

> **using**\<`T`\>(`apply`, `fn`, `name?`): `Promise`\<`T`\>

Defined in: [types.ts:268](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/types.ts#L268)

##### Type Parameters

###### T

`T`

##### Parameters

###### apply

(`c`) => `void` \| `Promise`\<`void`\>

###### fn

(`c`) => `T` \| `Promise`\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`Promise`\<`T`\>
