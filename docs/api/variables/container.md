[**@orkestrel/core**](../index.md)

***

# Variable: container

> `const` **container**: (`name?`) => [`Container`](../classes/Container.md) & `object`

Defined in: [container.ts:487](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/container.ts#L487)

Global container getter and manager.

## Type Declaration

### get()

> **get**: \{\<`T`\>(`token`, `name?`): `T` \| `undefined`; \<`A`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: A\[K\<K\>\] \| undefined \}; \<`O`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: O\[K\] \| undefined \}; \<`TMap`\>(`tokens`, `name?`): [`OptionalResolvedMap`](../type-aliases/OptionalResolvedMap.md)\<`TMap`\>; \} = `containerGet`

#### Call Signature

> \<`T`\>(`token`, `name?`): `T` \| `undefined`

##### Type Parameters

###### T

`T`

##### Parameters

###### token

[`Token`](../type-aliases/Token.md)\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`T` \| `undefined`

#### Call Signature

> \<`A`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: A\[K\<K\>\] \| undefined \}

##### Type Parameters

###### A

`A` *extends* readonly `unknown`[]

##### Parameters

###### tokens

[`InjectTuple`](../type-aliases/InjectTuple.md)\<`A`\>

###### name?

`string` | `symbol`

##### Returns

\{ \[K in string \| number \| symbol\]: A\[K\<K\>\] \| undefined \}

#### Call Signature

> \<`O`\>(`tokens`, `name?`): \{ \[K in string \| number \| symbol\]: O\[K\] \| undefined \}

##### Type Parameters

###### O

`O` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### tokens

[`InjectObject`](../type-aliases/InjectObject.md)\<`O`\>

###### name?

`string` | `symbol`

##### Returns

\{ \[K in string \| number \| symbol\]: O\[K\] \| undefined \}

#### Call Signature

> \<`TMap`\>(`tokens`, `name?`): [`OptionalResolvedMap`](../type-aliases/OptionalResolvedMap.md)\<`TMap`\>

##### Type Parameters

###### TMap

`TMap` *extends* [`TokenRecord`](../type-aliases/TokenRecord.md)

##### Parameters

###### tokens

`TMap`

###### name?

`string` | `symbol`

##### Returns

[`OptionalResolvedMap`](../type-aliases/OptionalResolvedMap.md)\<`TMap`\>

### resolve()

> **resolve**: \{\<`T`\>(`token`, `name?`): `T`; \<`O`\>(`tokens`, `name?`): `O`; \<`A`\>(`tokens`, `name?`): `A`; \<`TMap`\>(`tokens`, `name?`): [`ResolvedMap`](../type-aliases/ResolvedMap.md)\<`TMap`\>; \} = `containerResolve`

#### Call Signature

> \<`T`\>(`token`, `name?`): `T`

##### Type Parameters

###### T

`T`

##### Parameters

###### token

[`Token`](../type-aliases/Token.md)\<`T`\>

###### name?

`string` | `symbol`

##### Returns

`T`

#### Call Signature

> \<`O`\>(`tokens`, `name?`): `O`

##### Type Parameters

###### O

`O` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### tokens

[`InjectObject`](../type-aliases/InjectObject.md)\<`O`\>

###### name?

`string` | `symbol`

##### Returns

`O`

#### Call Signature

> \<`A`\>(`tokens`, `name?`): `A`

##### Type Parameters

###### A

`A` *extends* readonly `unknown`[]

##### Parameters

###### tokens

[`InjectTuple`](../type-aliases/InjectTuple.md)\<`A`\>

###### name?

`string` | `symbol`

##### Returns

`A`

#### Call Signature

> \<`TMap`\>(`tokens`, `name?`): [`ResolvedMap`](../type-aliases/ResolvedMap.md)\<`TMap`\>

##### Type Parameters

###### TMap

`TMap` *extends* [`TokenRecord`](../type-aliases/TokenRecord.md)

##### Parameters

###### tokens

`TMap`

###### name?

`string` | `symbol`

##### Returns

[`ResolvedMap`](../type-aliases/ResolvedMap.md)\<`TMap`\>

### using()

> **using**: \{(`fn`, `name?`): `Promise`\<`void`\>; \<`T`\>(`fn`, `name?`): `Promise`\<`T`\>; \<`T`\>(`apply`, `fn`, `name?`): `Promise`\<`T`\>; \} = `containerUsing`

#### Call Signature

> (`fn`, `name?`): `Promise`\<`void`\>

##### Parameters

###### fn

(`c`) => `void` \| `Promise`\<`void`\>

###### name?

`string` | `symbol`

##### Returns

`Promise`\<`void`\>

#### Call Signature

> \<`T`\>(`fn`, `name?`): `Promise`\<`T`\>

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

> \<`T`\>(`apply`, `fn`, `name?`): `Promise`\<`T`\>

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

### clear()

> **clear**(`name?`, `force?`): `boolean`

#### Parameters

##### name?

`string` | `symbol`

##### force?

`boolean`

#### Returns

`boolean`

### list()

> **list**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

### set()

> **set**(`name`, `c`, `lock?`): `void`

#### Parameters

##### name

`string` | `symbol`

##### c

[`Container`](../classes/Container.md)

##### lock?

`boolean`

#### Returns

`void`

## Example

```ts
import { container, createToken } from '@orkestrel/core'

const A = createToken<number>('A')
container().set(A, 7)
const v = container.resolve(A) // 7

await container.using(async (scope) => {
  scope.set(A, 1)
  // scoped registration does not leak
})
```
