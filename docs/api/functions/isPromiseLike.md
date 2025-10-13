[**@orkestrel/core**](../index.md)

***

# Function: isPromiseLike()

> **isPromiseLike**\<`T`\>(`x`): `x is PromiseLike<T>`

Defined in: [helpers.ts:555](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L555)

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
