[**@orkestrel/core**](../index.md)

***

# Function: isTokenArray()

> **isTokenArray**(`x`): `x is readonly Token<unknown>[]`

Defined in: [helpers.ts:260](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L260)

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
