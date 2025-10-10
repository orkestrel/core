[**@orkestrel/core**](../index.md)

***

# Function: isFiniteNumber()

> **isFiniteNumber**(`x`): `x is number`

Defined in: [helpers.ts:84](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L84)

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
