[**@orkestrel/core**](../index.md)

***

# Function: isToken()

> **isToken**(`x`): `x is Token<unknown>`

Defined in: [helpers.ts:266](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L266)

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
