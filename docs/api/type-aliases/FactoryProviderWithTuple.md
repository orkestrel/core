[**@orkestrel/core**](../index.md)

***

# Type Alias: FactoryProviderWithTuple\<T, A\>

> **FactoryProviderWithTuple**\<`T`, `A`\> = `object`

Defined in: [types.ts:24](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L24)

## Type Parameters

### T

`T`

### A

`A` *extends* readonly `unknown`[]

## Properties

### inject

> `readonly` **inject**: [`InjectTuple`](InjectTuple.md)\<`A`\>

Defined in: [types.ts:26](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L26)

***

### useFactory()

> `readonly` **useFactory**: (...`args`) => `T`

Defined in: [types.ts:25](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L25)

#### Parameters

##### args

...`A`

#### Returns

`T`
