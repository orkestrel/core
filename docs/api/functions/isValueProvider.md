[**@orkestrel/core**](../index.md)

***

# Function: isValueProvider()

> **isValueProvider**\<`T`\>(`p`): `p is ValueProvider<T>`

Defined in: [helpers.ts:120](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L120)

Check if a provider is a ValueProvider (`{ useValue }`).

## Type Parameters

### T

`T`

Provided value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider input

## Returns

`p is ValueProvider<T>`

True if `p` is a `ValueProvider`

## Example

```ts
isValueProvider({ useValue: 1 }) // true
```
