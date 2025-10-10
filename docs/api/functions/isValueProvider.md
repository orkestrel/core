[**@orkestrel/core**](../index.md)

***

# Function: isValueProvider()

> **isValueProvider**\<`T`\>(`p`): `p is ValueProvider<T>`

Defined in: [helpers.ts:296](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L296)

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
