[**@orkestrel/core**](../index.md)

***

# Function: isClassProvider()

> **isClassProvider**\<`T`\>(`p`): `p is ClassProvider<T>`

Defined in: [helpers.ts:329](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/helpers.ts#L329)

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
