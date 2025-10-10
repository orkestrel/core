[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithObject\<T, O\>

> **FactoryProviderWithObject**\<`T`, `O`\> = `object`

Defined in: [types.ts:28](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L28)

## Type Parameters

### T

`T`

### O

`O` *extends* `Record`\<`string`, `unknown`\>

## Properties

### inject

> `readonly` **inject**: [`InjectObject`](InjectObject.md)\<`O`\>

Defined in: [types.ts:31](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L31)

***

### useFactory()

> `readonly` **useFactory**: (`deps`) => `T`

Defined in: [types.ts:29](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L29)

#### Parameters

##### deps

`O`

#### Returns

`T`
