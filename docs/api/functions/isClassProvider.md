[**@orkestrel/core**](../index.md)

***

# Function: isClassProvider()

> **isClassProvider**\<`T`\>(`p`): `p is ClassProvider<T>`

Defined in: [helpers.ts:151](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L151)

Check if a provider is a ClassProvider (`{ useClass }`).

## Type Parameters

### T

`T`

Provided value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider input

## Returns

`p is ClassProvider<T>`

True if `p` is a `ClassProvider`

## Example

```ts
class S {}
isClassProvider({ useClass: S }) // true
```
