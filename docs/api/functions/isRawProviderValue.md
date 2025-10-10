[**@orkestrel/core**](../index.md)

***

# Function: isRawProviderValue()

> **isRawProviderValue**\<`T`\>(`p`): `p is T`

Defined in: [helpers.ts:637](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L637)

Check if provider input is a raw value (not a provider object).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider to check

## Returns

`p is T`

True if p is not a provider object

## Example

```ts
isRawProviderValue(42) // true
```
