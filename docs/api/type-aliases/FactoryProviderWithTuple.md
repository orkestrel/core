[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithTuple\<T, A\>

> **FactoryProviderWithTuple**\<`T`, `A`\> = `object`

Defined in: [types.ts:24](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L24)

## Type Parameters

### T

`T`

### A

`A` *extends* readonly `unknown`[]

## Properties

### inject

> `readonly` **inject**: [`InjectTuple`](InjectTuple.md)\<`A`\>

Defined in: [types.ts:26](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L26)

***

### useFactory()

> `readonly` **useFactory**: (...`args`) => `T`

Defined in: [types.ts:25](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L25)

#### Parameters

##### args

...`A`

#### Returns

`T`
