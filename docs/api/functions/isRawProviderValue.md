[**@orkestrel/core**](../index.md)

***

# Function: isRawProviderValue()

> **isRawProviderValue**\<`T`\>(`p`): `p is T`

Defined in: [helpers.ts:637](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L637)

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
