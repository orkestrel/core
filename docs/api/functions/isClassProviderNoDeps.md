[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderNoDeps()

> **isClassProviderNoDeps**\<`T`\>(`p`): `p is ClassProviderNoDeps<T>`

Defined in: [helpers.ts:398](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L398)

Check if class provider has no dependencies (zero-arg constructor).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`ClassProvider`](../type-aliases/ClassProvider.md)\<`T`\>

ClassProvider to check

## Returns

`p is ClassProviderNoDeps<T>`

True if zero-arg constructor (and no explicit inject)

## Example

```ts
class S { constructor() {} }
isClassProviderNoDeps<number>({ useClass: S } as any)
```
