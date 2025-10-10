[**@orkestrel/core**](../index.md)

***

# Function: isValueProvider()

> **isValueProvider**\<`T`\>(`p`): `p is ValueProvider<T>`

Defined in: [helpers.ts:296](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L296)

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
