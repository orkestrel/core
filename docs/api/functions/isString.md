[**@orkestrel/core**](../index.md)

***

# Function: isString()

> **isString**(`x`): `x is string`

Defined in: [helpers.ts:52](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L52)

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
