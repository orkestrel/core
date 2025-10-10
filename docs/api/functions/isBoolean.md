[**@orkestrel/core**](../index.md)

***

# Function: isBoolean()

> **isBoolean**(`x`): `x is boolean`

Defined in: [helpers.ts:68](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L68)

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
