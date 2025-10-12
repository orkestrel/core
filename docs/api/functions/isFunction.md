[**@orkestrel/core**](../index.md)

***

# Function: isFunction()

## Call Signature

> **isFunction**(`x`): `x is (args: unknown[]) => unknown`

Defined in: [helpers.ts:87](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L87)

Check whether a value is a function.

### Parameters

#### x

`unknown`

Value to check

### Returns

`x is (args: unknown[]) => unknown`

True if x is a function, false otherwise

### Example

```ts
const f = (a: number) => a
if (isFunction(f)) {
  // f: (a: number) => number
}
isFunction(42) // false
```

## Call Signature

> **isFunction**\<`T`\>(`x`): `x is Extract<T, (args: unknown[]) => unknown>`

Defined in: [helpers.ts:88](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L88)

Check whether a value is a function.

### Type Parameters

#### T

`T`

### Parameters

#### x

`T`

Value to check

### Returns

`x is Extract<T, (args: unknown[]) => unknown>`

True if x is a function, false otherwise

### Example

```ts
const f = (a: number) => a
if (isFunction(f)) {
  // f: (a: number) => number
}
isFunction(42) // false
```
