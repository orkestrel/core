[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProvider()

> **isFactoryProvider**\<`T`\>(`p`): `p is FactoryProvider<T>`

Defined in: [helpers.ts:312](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L312)

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
