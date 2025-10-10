[**@orkestrel/core**](../index.md)

***

# Function: isToken()

> **isToken**(`x`): `x is Token<unknown>`

Defined in: [helpers.ts:245](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L245)

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
