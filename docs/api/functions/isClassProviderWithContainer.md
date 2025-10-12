[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderWithContainer()

> **isClassProviderWithContainer**\<`T`\>(`p`): `p is ClassProviderWithContainer<T>`

Defined in: [helpers.ts:402](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L402)

Check if class provider receives Container as constructor argument.

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

[`ClassProvider`](../type-aliases/ClassProvider.md)\<`T`\>

ClassProvider to check

## Returns

`p is ClassProviderWithContainer<T>`

True if constructor takes Container (and no explicit inject)

## Example

```ts
class S { constructor(_c: Container) {} }
isClassProviderWithContainer<number>({ useClass: S } as any)
```
