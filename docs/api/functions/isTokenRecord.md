[**@orkestrel/core**](../index.md)

***

# Function: isTokenRecord()

> **isTokenRecord**(`x`): `x is Record<string, Token<unknown>>`

Defined in: [helpers.ts:275](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L275)

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
