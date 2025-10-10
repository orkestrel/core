[**@orkestrel/core**](../index.md)

***

# Function: isPromiseLike()

> **isPromiseLike**\<`T`\>(`x`): `x is PromiseLike<T>`

Defined in: [helpers.ts:534](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L534)

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
