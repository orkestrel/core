[**@orkestrel/core**](../index.md)

***

# Type Alias: ClassProviderWithObject\<T, O\>

> **ClassProviderWithObject**\<`T`, `O`\> = `object`

Defined in: [types.ts:48](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L48)

## Type Parameters

### T

`T`

### O

`O` *extends* `Record`\<`string`, `unknown`\>

## Properties

### inject

> `readonly` **inject**: [`InjectObject`](InjectObject.md)\<`O`\>

Defined in: [types.ts:51](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L51)

***

### useClass()

> `readonly` **useClass**: (`deps`) => `T`

Defined in: [types.ts:49](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/types.ts#L49)

#### Parameters

##### deps

`O`

#### Returns

`T`
