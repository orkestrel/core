[**@orkestrel/core**](../index.md)

***

# Type Alias: ClassProviderWithObject\<T, O\>

> **ClassProviderWithObject**\<`T`, `O`\> = `object`

Defined in: [types.ts:44](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L44)

## Type Parameters

### T

`T`

### O

`O` *extends* `Record`\<`string`, `unknown`\>

## Properties

### inject

> `readonly` **inject**: [`InjectObject`](InjectObject.md)\<`O`\>

Defined in: [types.ts:46](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L46)

***

### useClass()

> `readonly` **useClass**: (`deps`) => `T`

Defined in: [types.ts:45](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L45)

#### Parameters

##### deps

`O`

#### Returns

`T`
