[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolveRule\<R\>

> **ResolveRule**\<`R`\> = `R` *extends* `"string"` ? `string` : `R` *extends* `"number"` ? `number` : `R` *extends* `"boolean"` ? `boolean` : `R` *extends* `"symbol"` ? `symbol` : `R` *extends* `"bigint"` ? `bigint` : `R` *extends* `"function"` ? (...`args`) => `unknown` : `R` *extends* `"object"` ? `Record`\<`string`, `unknown`\> : `R` *extends* [`Guard`](Guard.md)\<infer U\> ? `U` : `R` *extends* [`SchemaSpec`](SchemaSpec.md) ? [`FromSchema`](FromSchema.md)\<`R`\> : `never`

Defined in: [types.ts:92](https://github.com/orkestrel/core/blob/076093e61b67cd3d4198b173439f047ddbc97abc/src/types.ts#L92)

## Type Parameters

### R

`R`
