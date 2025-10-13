[**@orkestrel/core**](../index.md)

***

# Function: isClassProvider()

> **isClassProvider**\<`T`\>(`p`): `p is ClassProvider<T>`

Defined in: [helpers.ts:350](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L350)

Check if provider has a ClassProvider shape (`{ useClass }`).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`Provider`](../type-aliases/Provider.md)\<`T`\>

Provider to check

## Returns

`p is ClassProvider<T>`

True if p is ClassProvider

## Example

```ts
class S {}
isClassProvider({ useClass: S }) // true
```
