[**@orkestrel/core**](../index.md)

***

# Function: isFiniteNumber()

> **isFiniteNumber**(`x`): `x is number`

Defined in: [helpers.ts:105](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L105)

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
