[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithTuple\<T, A\>

> **FactoryProviderWithTuple**\<`T`, `A`\> = `object`

Defined in: [types.ts:21](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L21)

## Type Parameters

### T

`T`

### A

`A` *extends* readonly `unknown`[]

## Properties

### inject

> `readonly` **inject**: [`InjectTuple`](InjectTuple.md)\<`A`\>

Defined in: [types.ts:23](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L23)

***

### useFactory()

> `readonly` **useFactory**: (...`args`) => `T`

Defined in: [types.ts:22](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/types.ts#L22)

#### Parameters

##### args

...`A`

#### Returns

`T`
