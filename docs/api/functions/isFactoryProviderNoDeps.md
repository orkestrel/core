[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderNoDeps()

> **isFactoryProviderNoDeps**\<`T`\>(`p`): `p is FactoryProviderNoDeps<T>`

Defined in: [helpers.ts:488](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L488)

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
