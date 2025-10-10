[**@orkestrel/core**](../index.md)

***

# Function: isToken()

> **isToken**(`x`): `x is Token<unknown>`

Defined in: [helpers.ts:245](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L245)

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
