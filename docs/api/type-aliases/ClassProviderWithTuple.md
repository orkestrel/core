[**@orkestrel/core**](../index.md)

***

# Type Alias: ClassProviderWithTuple\<T, A\>

> **ClassProviderWithTuple**\<`T`, `A`\> = `object`

Defined in: [types.ts:40](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L40)

## Type Parameters

### T

`T`

### A

`A` *extends* readonly `unknown`[]

## Properties

### inject

> `readonly` **inject**: [`InjectTuple`](InjectTuple.md)\<`A`\>

Defined in: [types.ts:42](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L42)

***

### useClass()

> `readonly` **useClass**: (...`args`) => `T`

Defined in: [types.ts:41](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L41)

#### Parameters

##### args

...`A`

#### Returns

`T`
