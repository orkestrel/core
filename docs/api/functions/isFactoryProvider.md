[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProvider()

> **isFactoryProvider**\<`T`\>(`p`): `p is FactoryProvider<T>`

Defined in: [helpers.ts:312](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L312)

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
