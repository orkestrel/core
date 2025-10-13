[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderWithTuple()

> **isFactoryProviderWithTuple**\<`T`, `A`\>(`p`): `p is FactoryProviderWithTuple<T, A>`

Defined in: [helpers.ts:437](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L437)

Check if factory provider uses tuple injection (inject: `[A, B, ...]`).

## Type Parameters

### T

`T`

Provider value type

### A

`A` *extends* readonly `unknown`[]

Tuple type of injected dependencies

## Parameters

### p

Provider to check

`T` | [`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\> | [`FactoryProviderNoDeps`](../type-aliases/FactoryProviderNoDeps.md)\<`T`\> | [`FactoryProviderWithContainer`](../type-aliases/FactoryProviderWithContainer.md)\<`T`\> | [`FactoryProviderWithTuple`](../type-aliases/FactoryProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`FactoryProviderWithObject`](../type-aliases/FactoryProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\> | [`ClassProviderNoDeps`](../type-aliases/ClassProviderNoDeps.md)\<`T`\> | [`ClassProviderWithContainer`](../type-aliases/ClassProviderWithContainer.md)\<`T`\> | [`ClassProviderWithTuple`](../type-aliases/ClassProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`ClassProviderWithObject`](../type-aliases/ClassProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\>

## Returns

`p is FactoryProviderWithTuple<T, A>`

True if tuple-injected FactoryProvider

## Example

```ts
const p = { useFactory: (a: number, b: string) => a + b.length, inject: [Symbol('A'), Symbol('B')] }
isFactoryProviderWithTuple<number, readonly [number, string]>(p as any)
```
