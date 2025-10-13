[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderWithTuple()

> **isFactoryProviderWithTuple**\<`T`, `A`\>(`p`): `p is FactoryProviderWithTuple<T, A>`

Defined in: [helpers.ts:233](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L233)

Factory provider that uses tuple injection (`inject: [A, B, ...]`).

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

`p is FactoryProviderWithTuple<T, A>`

True if factory provider injects via a tuple of tokens

## Example

```ts
const p = { useFactory: (a: number, b: string) => a + b.length, inject: [Symbol('A'), Symbol('B')] }
isFactoryProviderWithTuple<number, readonly [number, string]>p
```
