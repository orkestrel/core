[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderWithContainer()

> **isFactoryProviderWithContainer**\<`T`\>(`p`): `p is FactoryProviderWithContainer<T>`

Defined in: [helpers.ts:450](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L450)

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
