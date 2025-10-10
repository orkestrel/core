[**@orkestrel/core**](../index.md)

***

# Function: isTokenRecord()

> **isTokenRecord**(`x`): `x is Record<string, Token<unknown>>`

Defined in: [helpers.ts:275](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L275)

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
