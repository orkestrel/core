[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderWithObject()

> **isClassProviderWithObject**\<`T`\>(`p`): `p is ClassProviderWithObject<T, Record<string, unknown>>`

Defined in: [helpers.ts:385](https://github.com/orkestrel/core/blob/ccb170966790f428093f11a71a5646a6e842dbf9/src/helpers.ts#L385)

Check if class provider uses object injection (inject: `{ a: A, b: B }`).

## Type Parameters

### T

`T`

Provider value type

## Parameters

### p

Provider to check

`T` | [`ValueProvider`](../interfaces/ValueProvider.md)\<`T`\> | [`FactoryProviderNoDeps`](../type-aliases/FactoryProviderNoDeps.md)\<`T`\> | [`FactoryProviderWithContainer`](../type-aliases/FactoryProviderWithContainer.md)\<`T`\> | [`FactoryProviderWithTuple`](../type-aliases/FactoryProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`FactoryProviderWithObject`](../type-aliases/FactoryProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\> | [`ClassProviderNoDeps`](../type-aliases/ClassProviderNoDeps.md)\<`T`\> | [`ClassProviderWithContainer`](../type-aliases/ClassProviderWithContainer.md)\<`T`\> | [`ClassProviderWithTuple`](../type-aliases/ClassProviderWithTuple.md)\<`T`, readonly `unknown`[]\> | [`ClassProviderWithObject`](../type-aliases/ClassProviderWithObject.md)\<`T`, `Record`\<`string`, `unknown`\>\>

## Returns

`p is ClassProviderWithObject<T, Record<string, unknown>>`

True if object-injected ClassProvider

## Example

```ts
class S { constructor(_deps: { a: number, b: string }) {} }
isClassProviderWithObject<number>({ useClass: S, inject: { a: Symbol('A'), b: Symbol('B') } } as any)
```
