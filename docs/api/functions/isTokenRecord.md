[**@orkestrel/core**](../index.md)

***

# Function: isTokenRecord()

> **isTokenRecord**(`x`): `x is Record<string, Token<unknown>>`

Defined in: [helpers.ts:296](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L296)

Guard that checks an object is a map whose values are all tokens.

## Parameters

### x

`unknown`

Value to check

## Returns

`x is Record<string, Token<unknown>>`

True if x is an object (not array) with token values

## Example

```ts
isTokenRecord({ a: Symbol('a') }) // true
```
