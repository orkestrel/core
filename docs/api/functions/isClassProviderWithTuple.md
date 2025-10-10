[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderWithTuple()

> **isClassProviderWithTuple**\<`T`, `A`\>(`p`): `p is ClassProviderWithTuple<T, A>`

Defined in: [helpers.ts:347](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/helpers.ts#L347)

Check if class provider uses tuple injection (inject: `[A, B, ...]`).

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

`p is ClassProviderWithTuple<T, A>`

True if tuple-injected ClassProvider

## Example

```ts
class S { constructor(_a: number, _b: string) {} }
isClassProviderWithTuple<number, readonly [number, string]>({ useClass: S, inject: [Symbol('A'), Symbol('B')] })
```
