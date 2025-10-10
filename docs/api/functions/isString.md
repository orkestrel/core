[**@orkestrel/core**](../index.md)

***

# Function: isString()

> **isString**(`x`): `x is string`

Defined in: [helpers.ts:52](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L52)

Check whether a value is a string primitive.

## Parameters

### x

`unknown`

Value to check

## Returns

`x is string`

True if x is a string, false otherwise

## Example

```ts
isString('hello') // true
isString(123) // false
```
