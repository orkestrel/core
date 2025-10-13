[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithObject\<T, O\>

> **FactoryProviderWithObject**\<`T`, `O`\> = `object`

Defined in: [types.ts:25](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L25)

## Type Parameters

### T

`T`

### O

`O` *extends* `Record`\<`string`, `unknown`\>

## Properties

### inject

> `readonly` **inject**: [`InjectObject`](InjectObject.md)\<`O`\>

Defined in: [types.ts:27](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L27)

***

### useFactory()

> `readonly` **useFactory**: (`deps`) => `T`

Defined in: [types.ts:26](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L26)

#### Parameters

##### deps

`O`

#### Returns

`T`
