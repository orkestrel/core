[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolvedMap\<TMap\>

> **ResolvedMap**\<`TMap`\> = `{ [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }`

Defined in: [types.ts:11](https://github.com/orkestrel/core/blob/7cc3e19bc4a1e6f96f153d7b931686981208a465/src/types.ts#L11)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
