[**@orkestrel/core**](../index.md)

***

# Type Alias: ClassProviderWithTuple\<T, A\>

> **ClassProviderWithTuple**\<`T`, `A`\> = `object`

Defined in: [types.ts:44](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L44)

## Type Parameters

### T

`T`

### A

`A` *extends* readonly `unknown`[]

## Properties

### inject

> `readonly` **inject**: [`InjectTuple`](InjectTuple.md)\<`A`\>

Defined in: [types.ts:46](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L46)

***

### useClass()

> `readonly` **useClass**: (...`args`) => `T`

Defined in: [types.ts:45](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L45)

#### Parameters

##### args

...`A`

#### Returns

`T`
