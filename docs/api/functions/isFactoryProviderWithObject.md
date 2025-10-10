[**@orkestrel/core**](../index.md)

***

# Function: isFactoryProviderWithObject()

> **isFactoryProviderWithObject**\<`T`\>(`p`): `p is FactoryProviderWithObject<T, Record<string, unknown>>`

Defined in: [helpers.ts:433](https://github.com/orkestrel/core/blob/98df1af1b029ad0f39e413b90869151f4152e5dd/src/helpers.ts#L433)

Check if factory provider uses object injection (inject: `{ a: A, b: B }`).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

Provider to check

`T` | [`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\> | [`FactoryProviderNoDeps`](../type-aliases/FactoryProviderNoDeps.md)\<`T`\> | [`FactoryProviderWithContainer`](../type-aliases/FactoryProviderWithContainer.md)\<`T`\> | [`FactoryProviderWithTuple`](../type-aliases/FactoryProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`FactoryProviderWithObject`](../type-aliases/FactoryProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\> | [`ClassProviderNoDeps`](../type-aliases/ClassProviderNoDeps.md)\<`T`\> | [`ClassProviderWithContainer`](../type-aliases/ClassProviderWithContainer.md)\<`T`\> | [`ClassProviderWithTuple`](../type-aliases/ClassProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`ClassProviderWithObject`](../type-aliases/ClassProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\>

## Returns

`p is FactoryProviderWithObject<T, Record<string, unknown>>`

True if object-injected FactoryProvider

## Example

```ts
const p = { useFactory: (d: { a: number, b: string }) => d.a + d.b.length, inject: { a: Symbol('A'), b: Symbol('B') } }
isFactoryProviderWithObject<number>(p as any)
```
