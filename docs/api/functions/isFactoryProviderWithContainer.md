[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderWithContainer()

> **isFactoryProviderWithContainer**\<`T`\>(`p`): `p is FactoryProviderWithContainer<T>`

Defined in: [helpers.ts:471](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L471)

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
