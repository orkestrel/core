[**@orkestrel/core**](../index.md)

***

# Function: isString()

> **isString**(`x`): `x is string`

Defined in: [helpers.ts:52](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L52)

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
