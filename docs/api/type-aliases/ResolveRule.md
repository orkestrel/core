[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolveRule\<R\>

> **ResolveRule**\<`R`\> = `R` *extends* `"string"` ? `string` : `R` *extends* `"number"` ? `number` : `R` *extends* `"boolean"` ? `boolean` : `R` *extends* `"symbol"` ? `symbol` : `R` *extends* `"bigint"` ? `bigint` : `R` *extends* `"function"` ? (...`args`) => `unknown` : `R` *extends* `"object"` ? `Record`\<`string`, `unknown`\> : `R` *extends* [`Guard`](Guard.md)\<infer U\> ? `U` : `R` *extends* [`SchemaSpec`](SchemaSpec.md) ? [`FromSchema`](FromSchema.md)\<`R`\> : `never`

Defined in: [types.ts:87](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L87)

## Type Parameters

### R

`R`
