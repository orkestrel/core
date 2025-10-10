[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderWithContainer()

> **isClassProviderWithContainer**\<`T`\>(`p`): `p is ClassProviderWithContainer<T>`

Defined in: [helpers.ts:381](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/helpers.ts#L381)

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
