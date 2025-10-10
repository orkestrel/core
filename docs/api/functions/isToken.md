[**@orkestrel/core**](../index.md)

***

# Function: isToken()

> **isToken**(`x`): `x is Token<unknown>`

Defined in: [helpers.ts:245](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L245)

Runtime check that a value is a Token (Symbol).

## Parameters

### x

`unknown`

Value to check

## Returns

`x is Token<unknown>`

True if x is a symbol

## Example

```ts
isToken(Symbol('x')) // true
```
