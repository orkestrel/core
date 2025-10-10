[**@orkestrel/core**](../index.md)

***

# Function: isClassProviderWithObject()

> **isClassProviderWithObject**\<`T`\>(`p`): `p is ClassProviderWithObject<T, Record<string, unknown>>`

Defined in: [helpers.ts:364](https://github.com/orkestrel/core/blob/36bb4ac962a6eb83d3b3b7e1d15ed7b2fd751427/src/helpers.ts#L364)

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
