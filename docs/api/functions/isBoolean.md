[**@orkestrel/core**](../index.md)

***

# Function: isBoolean()

> **isBoolean**(`x`): `x is boolean`

Defined in: [helpers.ts:68](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L68)

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
