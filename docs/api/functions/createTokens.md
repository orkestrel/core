[**@orkestrel/core**](../index.md)

***

# Function: createTokens()

> **createTokens**\<`T`\>(`namespace`, `shape`): `Readonly`\<`{ [K in keyof T & string]: Token<T[K]> }`\>

Defined in: [helpers.ts:248](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/helpers.ts#L248)

Create a set of tokens from a shape under a given namespace.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `unknown`\>

Shape whose property types become the token types

## Parameters

### namespace

`string`

Description prefix for token symbols (e.g., 'ports')

### shape

`T`

Object whose keys become token names and types define token value types

## Returns

`Readonly`\<`{ [K in keyof T & string]: Token<T[K]> }`\>

Frozen map of tokens keyed by the shape's keys

## Example

```ts
const tokens = createTokens('services', { a: 0 as number, b: '' as string })
```
