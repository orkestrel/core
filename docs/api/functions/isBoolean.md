[**@orkestrel/core**](../index.md)

***

# Function: isBoolean()

> **isBoolean**(`x`): `x is boolean`

Defined in: [helpers.ts:68](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L68)

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
