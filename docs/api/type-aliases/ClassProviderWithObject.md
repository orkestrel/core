[**@orkestrel/core**](../index.md)

***

# Type Alias: ClassProviderWithObject\<T, O\>

> **ClassProviderWithObject**\<`T`, `O`\> = `object`

Defined in: [types.ts:48](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L48)

## Type Parameters

### T

`T`

### O

`O` *extends* `Record`\<`string`, `unknown`\>

## Properties

### inject

> `readonly` **inject**: [`InjectObject`](InjectObject.md)\<`O`\>

Defined in: [types.ts:51](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L51)

***

### useClass()

> `readonly` **useClass**: (`deps`) => `T`

Defined in: [types.ts:49](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L49)

#### Parameters

##### deps

`O`

#### Returns

`T`
