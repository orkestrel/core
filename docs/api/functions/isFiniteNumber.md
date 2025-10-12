[**@orkestrel/core**](../index.md)

***

# Function: isFiniteNumber()

> **isFiniteNumber**(`x`): `x is number`

Defined in: [helpers.ts:105](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L105)

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
