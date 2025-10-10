[**@orkestrel/core**](../index.md)

***

# Function: isTokenArray()

> **isTokenArray**(`x`): `x is readonly Token<unknown>[]`

Defined in: [helpers.ts:260](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L260)

Guard for arrays of tokens.

## Parameters

### x

`unknown`

Value to check

## Returns

`x is readonly Token<unknown>[]`

True if x is an array of symbols

## Example

```ts
isTokenArray([Symbol('a'), Symbol('b')]) // true
```
