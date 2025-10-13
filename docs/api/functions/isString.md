[**@orkestrel/core**](../index.md)

***

# Function: isString()

> **isString**(`x`): `x is string`

Defined in: [helpers.ts:52](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L52)

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
