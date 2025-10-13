[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderNoDeps()

> **isFactoryProviderNoDeps**\<`T`\>(`p`): `p is FactoryProviderNoDeps<T>`

Defined in: [helpers.ts:488](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L488)

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
