[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderNoDeps()

> **isClassProviderNoDeps**\<`T`\>(`p`): `p is ClassProviderNoDeps<T>`

Defined in: [helpers.ts:419](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L419)

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
