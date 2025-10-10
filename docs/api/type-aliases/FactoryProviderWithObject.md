[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithObject\<T, O\>

> **FactoryProviderWithObject**\<`T`, `O`\> = `object`

Defined in: [types.ts:28](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L28)

## Type Parameters

### T

`T`

### O

`O` *extends* `Record`\<`string`, `unknown`\>

## Properties

### inject

> `readonly` **inject**: [`InjectObject`](InjectObject.md)\<`O`\>

Defined in: [types.ts:31](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L31)

***

### useFactory()

> `readonly` **useFactory**: (`deps`) => `T`

Defined in: [types.ts:29](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L29)

#### Parameters

##### deps

`O`

#### Returns

`T`
