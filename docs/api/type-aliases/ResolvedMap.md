[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolvedMap\<TMap\>

> **ResolvedMap**\<`TMap`\> = `{ [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }`

Defined in: [types.ts:11](https://github.com/orkestrel/core/blob/4aab0d299da5f30a0c75f3eda95d1b02f821688d/src/types.ts#L11)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
