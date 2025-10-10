[**@orkestrel/core**](../index.md)

***

# Function: isZeroArg()

> **isZeroArg**\<`T`\>(`fn`): `fn is () => T`

Defined in: [helpers.ts:484](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L484)

Check if a function type accepts zero arguments.

## Type Parameters

### T

`T`

Function return type

## Parameters

### fn

() => `T`

Function to check

## Returns

`fn is () => T`

True if fn.length is 0

## Example

```ts
const f = () => 42
isZeroArg(f) // true
```
