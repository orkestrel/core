[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderWithContainer()

> **isFactoryProviderWithContainer**\<`T`\>(`p`): `p is FactoryProviderWithContainer<T>`

Defined in: [helpers.ts:450](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L450)

Check if factory provider receives Container as function argument.

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`FactoryProvider`](../type-aliases/FactoryProvider.md)\<`T`\>

FactoryProvider to check

## Returns

`p is FactoryProviderWithContainer<T>`

True if factory takes Container (and no explicit inject)

## Example

```ts
const p = { useFactory: (c: Container) => 1 }
isFactoryProviderWithContainer<number>(p as any)
```
