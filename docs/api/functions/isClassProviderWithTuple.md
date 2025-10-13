[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderWithTuple()

> **isClassProviderWithTuple**\<`T`, `A`\>(`p`): `p is ClassProviderWithTuple<T, A>`

Defined in: [helpers.ts:168](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L168)

Class provider that uses tuple injection (`inject: [A, B, ...]`).

## Type Parameters

### T

`T`

Provided value type

### A

`A` *extends* readonly `unknown`[]

Tuple of injected dependency types

## Parameters

### p

Provider input

`T` | [`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\> | [`FactoryProviderNoDeps`](../type-aliases/FactoryProviderNoDeps.md)\<`T`\> | [`FactoryProviderWithContainer`](../type-aliases/FactoryProviderWithContainer.md)\<`T`\> | [`FactoryProviderWithTuple`](../type-aliases/FactoryProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`FactoryProviderWithObject`](../type-aliases/FactoryProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\> | [`ClassProviderNoDeps`](../type-aliases/ClassProviderNoDeps.md)\<`T`\> | [`ClassProviderWithContainer`](../type-aliases/ClassProviderWithContainer.md)\<`T`\> | [`ClassProviderWithTuple`](../type-aliases/ClassProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`ClassProviderWithObject`](../type-aliases/ClassProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\>

## Returns

`p is ClassProviderWithTuple<T, A>`

True if class provider injects via a tuple of tokens

## Example

```ts
class S { constructor(_a: number, _b: string) {} }
isClassProviderWithTuple<number, readonly [number, string]>({ useClass: S, inject: [Symbol('A'), Symbol('B')] })
```
