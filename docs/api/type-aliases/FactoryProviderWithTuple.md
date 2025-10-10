[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithTuple\<T, A\>

> **FactoryProviderWithTuple**\<`T`, `A`\> = `object`

Defined in: [types.ts:24](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L24)

## Type Parameters

### T

`T`

### A

`A` *extends* readonly `unknown`[]

## Properties

### inject

> `readonly` **inject**: [`InjectTuple`](InjectTuple.md)\<`A`\>

Defined in: [types.ts:26](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L26)

***

### useFactory()

> `readonly` **useFactory**: (...`args`) => `T`

Defined in: [types.ts:25](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L25)

#### Parameters

##### args

...`A`

#### Returns

`T`
