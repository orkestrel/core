[**@orkestrel/core**](../index.md)

***

# Function: isZeroArg()

> **isZeroArg**\<`T`\>(`fn`): `fn is () => T`

Defined in: [helpers.ts:505](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L505)

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
