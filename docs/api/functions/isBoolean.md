[**@orkestrel/core**](../index.md)

***

# Function: isBoolean()

> **isBoolean**(`x`): `x is boolean`

Defined in: [helpers.ts:68](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L68)

Check whether a value is a boolean primitive.

## Parameters

### x

`unknown`

Value to check

## Returns

`x is boolean`

True if x is a boolean, false otherwise

## Example

```ts
isBoolean(true) // true
isBoolean(0) // false
```
