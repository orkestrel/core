[**@orkestrel/core**](../index.md)

***

# Function: isString()

> **isString**(`x`): `x is string`

Defined in: [helpers.ts:52](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L52)

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
