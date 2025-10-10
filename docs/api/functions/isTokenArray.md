[**@orkestrel/core**](../index.md)

***

# Function: isTokenArray()

> **isTokenArray**(`x`): `x is readonly Token<unknown>[]`

Defined in: [helpers.ts:260](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L260)

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
