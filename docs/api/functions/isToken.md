[**@orkestrel/core**](../index.md)

***

# Function: isToken()

> **isToken**(`x`): `x is Token<unknown>`

Defined in: [helpers.ts:71](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L71)

Guard that checks a value is a token (`symbol`).

## Parameters

### x

`unknown`

Value to check

## Returns

`x is Token<unknown>`

True if `x` is a `symbol`

## Example

```ts
isToken(Symbol('x')) // true
```
