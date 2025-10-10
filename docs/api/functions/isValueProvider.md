[**@orkestrel/core**](../index.md)

***

# Function: isValueProvider()

> **isValueProvider**\<`T`\>(`p`): `p is ValueProvider<T>`

Defined in: [helpers.ts:296](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L296)

Check if provider has a ValueProvider shape (`{ useValue }`).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider to check

## Returns

`p is ValueProvider<T>`

True if p is ValueProvider

## Example

```ts
isValueProvider({ useValue: 42 }) // true
```
