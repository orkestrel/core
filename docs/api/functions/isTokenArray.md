[**@orkestrel/core**](../index.md)

***

# Function: isTokenArray()

> **isTokenArray**(`x`): `x is readonly Token<unknown>[]`

Defined in: [helpers.ts:281](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L281)

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
