[**@orkestrel/core**](../index.md)

***

# Function: isFiniteNumber()

> **isFiniteNumber**(`x`): `x is number`

Defined in: [helpers.ts:84](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L84)

Check whether a value is a finite number (excludes NaN and Infinity).

## Parameters

### x

`unknown`

Value to check

## Returns

`x is number`

True if x is a finite number, false otherwise

## Example

```ts
isFiniteNumber(42) // true
isFiniteNumber(NaN) // false
```
