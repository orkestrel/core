[**@orkestrel/core**](../index.md)

***

# Function: isToken()

> **isToken**(`x`): `x is Token<unknown>`

Defined in: [helpers.ts:266](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L266)

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
