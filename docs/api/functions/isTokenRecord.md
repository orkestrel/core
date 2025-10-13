[**@orkestrel/core**](../index.md)

***

# Function: isTokenRecord()

> **isTokenRecord**(`x`): `x is Record<string, Token<unknown>>`

Defined in: [helpers.ts:100](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L100)

Guard that checks an object is a string‑keyed record whose values are all tokens.

## Parameters

### x

`unknown`

Value to check

## Returns

`x is Record<string, Token<unknown>>`

True if `x` is a non‑array object and all own string keys map to tokens

## Example

```ts
isTokenRecord({ a: Symbol('a') }) // true
isTokenRecord([Symbol('a')])      // false (array)
```
