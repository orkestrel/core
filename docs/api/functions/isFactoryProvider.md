[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProvider()

> **isFactoryProvider**\<`T`\>(`p`): `p is FactoryProvider<T>`

Defined in: [helpers.ts:333](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L333)

Check if provider has a FactoryProvider shape (`{ useFactory }`).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider to check

## Returns

`p is FactoryProvider<T>`

True if p is FactoryProvider

## Example

```ts
isFactoryProvider({ useFactory: () => 1 }) // true
```
