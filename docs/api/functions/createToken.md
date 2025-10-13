[**@orkestrel/core**](../index.md)

***

# Function: createToken()

> **createToken**\<`_T`\>(`description`): [`Token`](../type-aliases/Token.md)\<`_T`\>

Defined in: [helpers.ts:33](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/helpers.ts#L33)

Create a unique Token (a branded `symbol`) with a human‑friendly description.

## Type Parameters

### _T

`_T` = `unknown`

The value type carried by the token (typing only)

## Parameters

### description

`string`

The symbol description shown in diagnostics and logs

## Returns

[`Token`](../type-aliases/Token.md)\<`_T`\>

A new unique token symbol

## Example

```ts
const Port = createToken<{ ping(): void }>('Port')
```
