[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProvider()

> **isFactoryProvider**\<`T`\>(`p`): `p is FactoryProvider<T>`

Defined in: [helpers.ts:135](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L135)

Check if a provider is a FactoryProvider (`{ useFactory }`).

## Type Parameters

### T

`T`

Provided value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider input

## Returns

`p is FactoryProvider<T>`

True if `p` is a `FactoryProvider`

## Example

```ts
isFactoryProvider({ useFactory: () => 1 }) // true
```
