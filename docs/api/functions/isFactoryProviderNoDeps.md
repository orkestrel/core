[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderNoDeps()

> **isFactoryProviderNoDeps**\<`T`\>(`p`): `p is FactoryProviderNoDeps<T>`

Defined in: [helpers.ts:281](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L281)

Factory provider with a zero‑argument function (no dependencies).

## Type Parameters

### T

`T`

Provided value type

## Parameters

### p

[`FactoryProvider`](../type-aliases/FactoryProvider.md)\<`T`\>

Factory provider input

## Returns

`p is FactoryProviderNoDeps<T>`

True if the `useFactory` function has arity 0 and no `inject`

## Example

```ts
const fp: FactoryProviderNoDeps<number> = { useFactory: () => 1 }
isFactoryProviderNoDeps(fp) // true
```
