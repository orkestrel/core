[**@orkestrel/core**](../index.md)

***

# Function: createTokens()

> **createTokens**\<`T`\>(`namespace`, `shape`): `Readonly`\<`{ [K in keyof T & string]: Token<T[K]> }`\>

Defined in: [helpers.ts:54](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L54)

Create a readonly map of tokens from a shape, namespaced by a prefix.

Each key in `shape` becomes a token on the returned object. The token description
is built as `${namespace}:${key}` for consistent diagnostics.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `unknown`\>

Object shape whose property types become token types

## Parameters

### namespace

`string`

Description prefix (e.g., `ports`, `services`)

### shape

`T`

Object whose keys become token names and values define token types

## Returns

`Readonly`\<`{ [K in keyof T & string]: Token<T[K]> }`\>

A frozen object mapping keys to tokens

## Example

```ts
const Ports = createTokens('ports', { http: 0 as number, log: '' as string })
// Ports.http: Token<number>, description: "ports:http"
// Ports.log:  Token<string>, description: "ports:log"
```
