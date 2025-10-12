[**@orkestrel/core**](../index.md)

***

# Function: isRawProviderValue()

> **isRawProviderValue**\<`T`\>(`p`): `p is T`

Defined in: [helpers.ts:658](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L658)

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
