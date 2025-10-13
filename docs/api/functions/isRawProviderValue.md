[**@orkestrel/core**](../index.md)

***

# Function: isRawProviderValue()

> **isRawProviderValue**\<`T`\>(`p`): `p is T`

Defined in: [helpers.ts:383](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L383)

Check if a provider input is a raw value (i.e., not a provider object).

## Type Parameters

### T

`T`

Provided value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider input

## Returns

`p is T`

True if `p` is not an object provider

## Example

```ts
isRawProviderValue(42) // true
```
