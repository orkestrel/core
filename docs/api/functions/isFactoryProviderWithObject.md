[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderWithObject()

> **isFactoryProviderWithObject**\<`T`\>(`p`): `p is FactoryProviderWithObject<T, Record<string, unknown>>`

Defined in: [helpers.ts:249](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L249)

Factory provider that uses object injection (`inject: { a: A, b: B }`).

## Type Parameters

### T

`T`

Provided value type

## Parameters

### p

Provider input

`T` | [`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\> | [`FactoryProviderNoDeps`](../type-aliases/FactoryProviderNoDeps.md)\<`T`\> | [`FactoryProviderWithContainer`](../type-aliases/FactoryProviderWithContainer.md)\<`T`\> | [`FactoryProviderWithTuple`](../type-aliases/FactoryProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`FactoryProviderWithObject`](../type-aliases/FactoryProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\> | [`ClassProviderNoDeps`](../type-aliases/ClassProviderNoDeps.md)\<`T`\> | [`ClassProviderWithContainer`](../type-aliases/ClassProviderWithContainer.md)\<`T`\> | [`ClassProviderWithTuple`](../type-aliases/ClassProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`ClassProviderWithObject`](../type-aliases/ClassProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\>

## Returns

`p is FactoryProviderWithObject<T, Record<string, unknown>>`

True if factory provider injects via an object of tokens

## Example

```ts
const p = { useFactory: (d: { a: number, b: string }) => d.a + d.b.length, inject: { a: Symbol('A'), b: Symbol('B') } }
isFactoryProviderWithObject<number>p
```
