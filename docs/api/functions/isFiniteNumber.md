[**@orkestrel/core**](../index.md)

***

# Function: isFiniteNumber()

> **isFiniteNumber**(`x`): `x is number`

Defined in: [helpers.ts:84](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L84)

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
