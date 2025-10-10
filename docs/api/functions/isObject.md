[**@orkestrel/core**](../index.md)

***

# Function: isObject()

> **isObject**(`x`): `x is Record<string, unknown>`

Defined in: [helpers.ts:36](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L36)

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
