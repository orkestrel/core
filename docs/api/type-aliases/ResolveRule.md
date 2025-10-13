[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolveRule\<R\>

> **ResolveRule**\<`R`\> = `R` *extends* `"string"` ? `string` : `R` *extends* `"number"` ? `number` : `R` *extends* `"boolean"` ? `boolean` : `R` *extends* `"symbol"` ? `symbol` : `R` *extends* `"bigint"` ? `bigint` : `R` *extends* `"function"` ? (...`args`) => `unknown` : `R` *extends* `"object"` ? `Record`\<`string`, `unknown`\> : `R` *extends* [`Guard`](Guard.md)\<infer U\> ? `U` : `R` *extends* [`SchemaSpec`](SchemaSpec.md) ? [`FromSchema`](FromSchema.md)\<`R`\> : `never`

Defined in: [types.ts:87](https://github.com/orkestrel/core/blob/cbe5b2d7b027ca6f0f1301ef32750afb69b4764b/src/types.ts#L87)

## Type Parameters

### R

`R`
