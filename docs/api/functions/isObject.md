[**@orkestrel/core**](../index.md)

***

# Function: isObject()

> **isObject**(`x`): `x is Record<string, unknown>`

Defined in: [helpers.ts:36](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L36)

Check whether a value is a non-null object (arrays included).

## Parameters

### x

`unknown`

Value to check

## Returns

`x is Record<string, unknown>`

True if x is a non-null object (including arrays), false otherwise

## Example

```ts
isObject({}) // true
isObject([]) // true
isObject(null) // false
```
