[**@orkestrel/core**](../index.md)

***

# Function: isZeroArg()

> **isZeroArg**\<`T`\>(`fn`): `fn is () => T`

Defined in: [helpers.ts:505](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L505)

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
