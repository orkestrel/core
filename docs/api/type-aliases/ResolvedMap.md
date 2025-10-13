[**@orkestrel/core**](../index.md)

***

# Type Alias: ResolvedMap\<TMap\>

> **ResolvedMap**\<`TMap`\> = `{ [K in keyof TMap]: TMap[K] extends Token<infer U> ? U : never }`

Defined in: [types.ts:11](https://github.com/orkestrel/core/blob/240d6e1612057b96fd3fc03e1415fe3917a0f212/src/types.ts#L11)

## Type Parameters

### TMap

`TMap` *extends* [`TokenRecord`](TokenRecord.md)
