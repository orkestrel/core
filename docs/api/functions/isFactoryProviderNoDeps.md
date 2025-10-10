[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderNoDeps()

> **isFactoryProviderNoDeps**\<`T`\>(`p`): `p is FactoryProviderNoDeps<T>`

Defined in: [helpers.ts:467](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L467)

Check if factory provider has no dependencies (zero-arg function).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`FactoryProvider`](../type-aliases/FactoryProvider.md)\<`T`\>

FactoryProvider to check

## Returns

`p is FactoryProviderNoDeps<T>`

True if zero-arg factory (and no explicit inject)

## Example

```ts
const fp: FactoryProviderNoDeps<number> = { useFactory: () => 1 }
isZeroArg(fp.useFactory) // true
```
