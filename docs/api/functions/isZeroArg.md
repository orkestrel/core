[**@orkestrel/core**](../index.md)

***

# Function: isZeroArg()

> **isZeroArg**\<`T`\>(`fn`): `fn is () => T`

Defined in: [helpers.ts:484](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L484)

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
