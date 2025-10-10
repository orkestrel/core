[**@orkestrel/core**](../index.md)

***

# Function: isClassProvider()

> **isClassProvider**\<`T`\>(`p`): `p is ClassProvider<T>`

Defined in: [helpers.ts:329](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L329)

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
