[**@orkestrel/core**](../index.md)

***

# Function: isValueProvider()

> **isValueProvider**\<`T`\>(`p`): `p is ValueProvider<T>`

Defined in: [helpers.ts:317](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L317)

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
