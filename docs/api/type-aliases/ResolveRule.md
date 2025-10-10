[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolveRule\<R\>

> **ResolveRule**\<`R`\> = `R` *extends* `"string"` ? `string` : `R` *extends* `"number"` ? `number` : `R` *extends* `"boolean"` ? `boolean` : `R` *extends* `"symbol"` ? `symbol` : `R` *extends* `"bigint"` ? `bigint` : `R` *extends* `"function"` ? (...`args`) => `unknown` : `R` *extends* `"object"` ? `Record`\<`string`, `unknown`\> : `R` *extends* [`Guard`](Guard.md)\<infer U\> ? `U` : `R` *extends* [`SchemaSpec`](SchemaSpec.md) ? [`FromSchema`](FromSchema.md)\<`R`\> : `never`

Defined in: [types.ts:92](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L92)

## Type Parameters

### R

`R`
