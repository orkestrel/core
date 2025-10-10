[**@orkestrel/core**](../index.md)

***

# Function: isPromiseLike()

> **isPromiseLike**\<`T`\>(`x`): `x is PromiseLike<T>`

Defined in: [helpers.ts:534](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L534)

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
