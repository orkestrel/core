[**@orkestrel/core**](../index.md)

***

# Function: isPromiseLike()

> **isPromiseLike**\<`T`\>(`x`): `x is PromiseLike<T>`

Defined in: [helpers.ts:534](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L534)

Narrow a value to Promise-like (duck-typed thenable).

## Type Parameters

### T

`T` = `unknown`

Promised value type

## Parameters

### x

`unknown`

Value to check

## Returns

`x is PromiseLike<T>`

True if x has a callable then method

## Example

```ts
isPromiseLike(Promise.resolve(1)) // true
```
