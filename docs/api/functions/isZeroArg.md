[**@orkestrel/core**](../index.md)

***

# Function: isZeroArg()

> **isZeroArg**\<`T`\>(`fn`): `fn is () => T`

Defined in: [helpers.ts:484](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L484)

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
