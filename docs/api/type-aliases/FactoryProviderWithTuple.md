[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithTuple\<T, A\>

> **FactoryProviderWithTuple**\<`T`, `A`\> = `object`

Defined in: [types.ts:21](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L21)

## Type Parameters

### T

`T`

### A

`A` *extends* readonly `unknown`[]

## Properties

### inject

> `readonly` **inject**: [`InjectTuple`](InjectTuple.md)\<`A`\>

Defined in: [types.ts:23](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L23)

***

### useFactory()

> `readonly` **useFactory**: (...`args`) => `T`

Defined in: [types.ts:22](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L22)

#### Parameters

##### args

...`A`

#### Returns

`T`
